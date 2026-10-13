import * as Crypto from 'expo-crypto';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import {
  battingFirstTeamId,
  validateXi,
  xiOverlap,
  type MatchBasics,
  type TossDecision,
  type XiEntry,
} from '@/core/matchSetup';
import { replay } from '@/core/scoring';
import { db, type Tx } from '@/db/client';
import { enqueue } from '@/db/outbox';
import { deliveries, innings, matches, playingXi } from '@/db/schema';
import { configOf, rowToDelivery, setupOf, type MatchRow } from '@/features/scoring/mappers';
import { reconcileMatch } from '@/features/scoring/reconcile';
import { requestSync } from '@/sync/syncService';

export type { MatchRow };
export interface Openers {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}
export class MatchSetupError extends Error {}

const now = () => new Date().toISOString();

async function writeXi(
  tx: Tx,
  matchId: string,
  teamId: string,
  entries: readonly XiEntry[],
): Promise<void> {
  const existing = await tx
    .select()
    .from(playingXi)
    .where(and(eq(playingXi.matchId, matchId), eq(playingXi.teamId, teamId)));
  const keep = new Set(entries.map((e) => e.playerId));
  const t = now();
  for (const row of existing) {
    if (row.active && !keep.has(row.playerId)) {
      const next = { ...row, active: false, updatedAt: t };
      await tx
        .update(playingXi)
        .set({ active: false, updatedAt: t })
        .where(and(eq(playingXi.matchId, matchId), eq(playingXi.playerId, row.playerId)));
      await enqueue(tx, 'playing_xi', `${matchId}:${row.playerId}`, next);
    }
  }
  for (const [i, e] of entries.entries()) {
    const prev = existing.find((r) => r.playerId === e.playerId);
    const row = {
      matchId,
      playerId: e.playerId,
      teamId,
      battingOrder: i + 1,
      isCaptain: !!e.isCaptain,
      isKeeper: !!e.isKeeper,
      active: true,
      createdAt: prev?.createdAt ?? t,
      updatedAt: t,
    };
    await tx
      .insert(playingXi)
      .values(row)
      .onConflictDoUpdate({ target: [playingXi.matchId, playingXi.playerId], set: row });
    await enqueue(tx, 'playing_xi', `${matchId}:${e.playerId}`, row);
  }
}

/** Steps 1–2 of the wizard. The XIs may be saved later (match stays "upcoming"). */
export async function createMatch(
  basics: MatchBasics,
  userId: string,
  xi?: { teamA: readonly XiEntry[]; teamB: readonly XiEntry[] },
): Promise<string> {
  const id = Crypto.randomUUID();
  const t = now();
  await db.transaction(async (tx) => {
    const row = {
      id,
      teamAId: basics.teamAId,
      teamBId: basics.teamBId,
      format: basics.format,
      oversPerInnings: basics.oversPerInnings,
      ballsPerOver: 6,
      maxOversPerBowler: basics.maxOversPerBowler,
      freeHitEnabled: basics.freeHitEnabled,
      playersPerSide: 11,
      scheduledAt: basics.scheduledAt,
      venue: basics.venue ?? null,
      stage: basics.stage ?? null,
      tournamentName: basics.tournamentName ?? null,
      tossWinnerId: null,
      tossDecision: null,
      status: 'upcoming' as const,
      resultType: null,
      winnerTeamId: null,
      marginType: null,
      marginValue: null,
      resultSummary: null,
      playerOfMatchId: null,
      scorerId: userId,
      createdBy: userId,
      archivedAt: null,
      createdAt: t,
      updatedAt: t,
    };
    await tx.insert(matches).values(row);
    await enqueue(tx, 'matches', id, row);
    if (xi) {
      await writeXi(tx, id, basics.teamAId, xi.teamA);
      await writeXi(tx, id, basics.teamBId, xi.teamB);
    }
  });
  requestSync();
  return id;
}

/** Replaces the XI of one side. Only before the first ball. */
export async function saveXi(
  matchId: string,
  teamId: string,
  entries: readonly XiEntry[],
): Promise<void> {
  await db.transaction(async (tx) => {
    const [m] = await tx.select().from(matches).where(eq(matches.id, matchId));
    if (!m) throw new MatchSetupError('Match not found.');
    if (m.status !== 'upcoming')
      throw new MatchSetupError('The XI cannot change after the match has started.');
    const problem = validateXi(entries, m.playersPerSide);
    if (problem) throw new MatchSetupError(problem);
    await writeXi(tx, matchId, teamId, entries);
  });
  requestSync();
}

export async function setToss(
  matchId: string,
  winnerId: string,
  decision: TossDecision,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [m] = await tx.select().from(matches).where(eq(matches.id, matchId));
    if (!m) throw new MatchSetupError('Match not found.');
    if (m.status !== 'upcoming')
      throw new MatchSetupError('The toss cannot change after the match has started.');
    if (winnerId !== m.teamAId && winnerId !== m.teamBId)
      throw new MatchSetupError('The toss winner must be one of the two teams.');
    const t = now();
    await tx
      .update(matches)
      .set({ tossWinnerId: winnerId, tossDecision: decision, updatedAt: t })
      .where(eq(matches.id, matchId));
    await enqueue(tx, 'matches', matchId, {
      ...m,
      tossWinnerId: winnerId,
      tossDecision: decision,
      updatedAt: t,
    });
  });
  requestSync();
}

async function startInnings(
  tx: Tx,
  matchId: string,
  inningsNo: 1 | 2,
  openers: Openers,
  userId: string,
): Promise<void> {
  const [m] = await tx.select().from(matches).where(eq(matches.id, matchId));
  if (!m) throw new MatchSetupError('Match not found.');
  const xi = await tx.select().from(playingXi).where(eq(playingXi.matchId, matchId));
  const existing = await tx.select().from(innings).where(eq(innings.matchId, matchId));
  if (existing.some((i) => i.inningsNo === inningsNo))
    throw new MatchSetupError('This innings has already started.');
  const t = now();

  let battingTeamId: string;
  let target: number | null = null;
  if (inningsNo === 1) {
    if (!m.tossWinnerId || !m.tossDecision) throw new MatchSetupError('Record the toss first.');
    for (const teamId of [m.teamAId, m.teamBId]) {
      const side = xi
        .filter((x) => x.active && x.teamId === teamId)
        .map((x) => ({ playerId: x.playerId }));
      const problem = validateXi(side, m.playersPerSide);
      if (problem) throw new MatchSetupError(problem);
    }
    battingTeamId = battingFirstTeamId(m.teamAId, m.teamBId, m.tossWinnerId, m.tossDecision);
  } else {
    const first = existing.find((i) => i.inningsNo === 1);
    if (!first || first.status !== 'completed')
      throw new MatchSetupError('The first innings is not complete.');
    const ds = (await tx.select().from(deliveries).where(eq(deliveries.inningsId, first.id))).map(
      (r) => ({ ...rowToDelivery(r), inningsNo: 1 as const }),
    );
    const s1 = replay(configOf(m), setupOf(first, xi), ds);
    target = s1.runs + 1;
    battingTeamId = first.bowlingTeamId;
  }
  const bowlingTeamId = battingTeamId === m.teamAId ? m.teamBId : m.teamAId;
  const battingXI = xi.filter((x) => x.active && x.teamId === battingTeamId).map((x) => x.playerId);
  const bowlingXI = xi.filter((x) => x.active && x.teamId === bowlingTeamId).map((x) => x.playerId);
  if (
    !battingXI.includes(openers.strikerId) ||
    !battingXI.includes(openers.nonStrikerId) ||
    openers.strikerId === openers.nonStrikerId
  )
    throw new MatchSetupError('Choose two different opening batters from the batting XI.');
  if (!bowlingXI.includes(openers.bowlerId))
    throw new MatchSetupError('Choose the opening bowler from the bowling XI.');

  const row = {
    id: Crypto.randomUUID(),
    matchId,
    inningsNo,
    battingTeamId,
    bowlingTeamId,
    openingStrikerId: openers.strikerId,
    openingNonStrikerId: openers.nonStrikerId,
    openingBowlerId: openers.bowlerId,
    target,
    status: 'in_progress' as const,
    endReason: null,
    createdAt: t,
    updatedAt: t,
  };
  await tx.insert(innings).values(row);
  await enqueue(tx, 'innings', row.id, row);
  if (inningsNo === 1) {
    await tx.update(matches).set({ scorerId: userId, updatedAt: t }).where(eq(matches.id, matchId));
    await enqueue(tx, 'matches', matchId, { ...m, scorerId: userId, updatedAt: t });
  }
  await reconcileMatch(tx, matchId);
}

export async function startFirstInnings(
  matchId: string,
  openers: Openers,
  userId: string,
): Promise<void> {
  await db.transaction((tx) => startInnings(tx, matchId, 1, openers, userId));
  requestSync();
}

export async function startSecondInnings(
  matchId: string,
  openers: Openers,
  userId: string,
): Promise<void> {
  await db.transaction((tx) => startInnings(tx, matchId, 2, openers, userId));
  requestSync();
}

export async function listMatches(status?: MatchRow['status'][]): Promise<MatchRow[]> {
  const base = isNull(matches.archivedAt);
  return db
    .select()
    .from(matches)
    .where(status ? and(base, inArray(matches.status, status)) : base)
    .orderBy(desc(matches.scheduledAt));
}

export { xiOverlap };
