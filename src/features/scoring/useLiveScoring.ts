import { useMemo } from 'react';
import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { chaseInfo, nextBallContext, replay, type InningsState } from '@/core/scoring';
import { db } from '@/db/client';
import { deliveries, innings, matches, playingXi, players, teams } from '@/db/schema';
import { configOf, rowToDelivery, setupOf } from './mappers';

/**
 * Everything the live screens need, derived from the local database (single source of truth).
 * The innings state is REPLAYED from stored deliveries whenever they change — there is no separate score store.
 */
export function useLiveScoring(matchId: string) {
  const { data: matchRows } = useLiveQuery(
    db.select().from(matches).where(eq(matches.id, matchId)),
    [matchId],
  );
  const { data: inningsRows } = useLiveQuery(
    db.select().from(innings).where(eq(innings.matchId, matchId)).orderBy(asc(innings.inningsNo)),
    [matchId],
  );
  const { data: xi } = useLiveQuery(
    db.select().from(playingXi).where(eq(playingXi.matchId, matchId)),
    [matchId],
  );
  const current = inningsRows[inningsRows.length - 1] ?? null;
  const { data: deliveryRows } = useLiveQuery(
    db
      .select()
      .from(deliveries)
      .where(eq(deliveries.inningsId, current?.id ?? '')),
    [current?.id ?? ''],
  );
  const prev = inningsRows.length > 1 ? (inningsRows[0] ?? null) : null;
  const { data: prevRows } = useLiveQuery(
    db
      .select()
      .from(deliveries)
      .where(eq(deliveries.inningsId, prev?.id ?? '')),
    [prev?.id ?? ''],
  );
  const { data: playerRows } = useLiveQuery(db.select().from(players));
  const { data: teamRows } = useLiveQuery(db.select().from(teams));

  return useMemo(() => {
    const match = matchRows[0] ?? null;
    if (!match) return { ready: false as const };
    const playerById = new Map(playerRows.map((p) => [p.id, p]));
    const teamById = new Map(teamRows.map((t) => [t.id, t]));
    const cfg = configOf(match);
    let setup = null;
    let state: InningsState | null = null;
    let firstState: InningsState | null = null;
    if (prev) {
      const prevList = prevRows.map((r) => ({ ...rowToDelivery(r), inningsNo: 1 as const }));
      firstState = replay(cfg, setupOf(prev, xi), prevList);
      firstState.status = prev.status; // manual ends are stored on the row
    }
    if (current) {
      setup = setupOf(current, xi);
      const list = deliveryRows.map((r) => ({
        ...rowToDelivery(r),
        inningsNo: current.inningsNo as 1 | 2,
      }));
      state = replay(cfg, setup, list);
      state.status = current.status;
      state.endReason = current.endReason;
      if (current.inningsNo === 1) firstState = state;
    }
    return {
      ready: true as const,
      match,
      cfg,
      inningsRows,
      current,
      setup,
      state,
      firstState,
      ctx: state ? nextBallContext(state, cfg) : null,
      chase: state ? chaseInfo(state, cfg) : null,
      xi,
      playerName: (id: string | null | undefined) =>
        id ? (playerById.get(id)?.name ?? 'Player') : '',
      player: (id: string) => playerById.get(id),
      teamName: (id: string) => teamById.get(id)?.name ?? 'Team',
      team: (id: string) => teamById.get(id),
    };
  }, [matchRows, inningsRows, current, prev, xi, deliveryRows, prevRows, playerRows, teamRows]);
}

export type LiveScoring = Extract<ReturnType<typeof useLiveScoring>, { ready: true }>;
