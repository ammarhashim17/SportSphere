import { eq } from 'drizzle-orm';
import { computeResult, replay, resultText, type InningsState } from '@/core/scoring';
import type { Tx } from '@/db/client';
import { enqueue } from '@/db/outbox';
import { deliveries, innings, matches, playingXi, teams } from '@/db/schema';
import { configOf, rowToDelivery, setupOf } from './mappers';

/**
 * Brings innings.status / match.status / result in line with the stored deliveries.
 * Call at the end of EVERY transaction that changes deliveries or innings. It is the only place that decides these fields.
 * Manual end (DECLARED / MANUAL) is stored on the innings row and is kept until an undo reopens the innings.
 */
export async function reconcileMatch(
  tx: Tx,
  matchId: string,
  opts: { reopenManual?: boolean } = {},
): Promise<void> {
  const [m] = await tx.select().from(matches).where(eq(matches.id, matchId));
  if (!m) return;
  const inningsRows = (await tx.select().from(innings).where(eq(innings.matchId, matchId))).sort(
    (a, b) => a.inningsNo - b.inningsNo,
  );
  const xi = await tx.select().from(playingXi).where(eq(playingXi.matchId, matchId));
  const cfg = configOf(m);
  const now = new Date().toISOString();

  const states: (InningsState | null)[] = [null, null];
  for (const row of inningsRows) {
    const ds = (await tx.select().from(deliveries).where(eq(deliveries.inningsId, row.id))).map(
      (r) => ({
        ...rowToDelivery(r),
        inningsNo: row.inningsNo as 1 | 2,
      }),
    );
    const st = replay(cfg, setupOf(row, xi), ds);
    const manual = row.endReason === 'DECLARED' || row.endReason === 'MANUAL';
    let status = st.status;
    let endReason = st.endReason;
    if (manual && !opts.reopenManual && st.status === 'in_progress') {
      status = 'completed';
      endReason = row.endReason;
    }
    states[row.inningsNo - 1] = st;
    if (row.status !== status || row.endReason !== endReason) {
      const next = { ...row, status, endReason, updatedAt: now };
      await tx
        .update(innings)
        .set({ status, endReason, updatedAt: now })
        .where(eq(innings.id, row.id));
      await enqueue(tx, 'innings', row.id, next);
      row.status = status;
      row.endReason = endReason;
    }
  }

  const [first, second] = states;
  const result =
    first && second
      ? computeResult(
          cfg,
          { ...first, status: inningsRows[0]?.status ?? first.status },
          { ...second, status: inningsRows[1]?.status ?? second.status },
        )
      : null;

  let status: typeof m.status = m.status;
  const patch: Partial<typeof m> = {};
  if (result) {
    status = 'completed';
    const [ta] = await tx.select().from(teams).where(eq(teams.id, m.teamAId));
    const [tb] = await tx.select().from(teams).where(eq(teams.id, m.teamBId));
    const nameOf = (id: string) => (id === m.teamAId ? ta?.name : tb?.name) ?? 'Team';
    const firstTeam = inningsRows[0]!.battingTeamId;
    const secondTeam = inningsRows[1]!.battingTeamId;
    patch.resultType = result.type === 'TIE' ? 'tie' : 'win';
    patch.winnerTeamId =
      result.type === 'WIN' ? (result.winner === 'FIRST' ? firstTeam : secondTeam) : null;
    patch.marginType =
      result.type === 'WIN' ? (result.marginType === 'RUNS' ? 'runs' : 'wickets') : null;
    patch.marginValue = result.type === 'WIN' ? result.margin : null;
    patch.resultSummary = resultText(result, {
      first: nameOf(firstTeam),
      second: nameOf(secondTeam),
    });
  } else if (inningsRows.length === 0) {
    status = m.status === 'upcoming' ? 'upcoming' : m.status;
  } else if (inningsRows.length === 1 && inningsRows[0]!.status === 'completed') {
    status = 'innings_break';
  } else {
    status = 'live';
  }
  if (!result && m.status === 'completed') {
    Object.assign(patch, {
      resultType: null,
      winnerTeamId: null,
      marginType: null,
      marginValue: null,
      resultSummary: null,
    });
  }

  const changed =
    status !== m.status ||
    Object.entries(patch).some(([k, v]) => (m as Record<string, unknown>)[k] !== v);
  if (changed) {
    const next = { ...m, ...patch, status, updatedAt: now };
    await tx
      .update(matches)
      .set({ ...patch, status, updatedAt: now })
      .where(eq(matches.id, matchId));
    await enqueue(tx, 'matches', matchId, next);
  }
}
