/* eslint-disable @typescript-eslint/no-require-imports, import/first */
/**
 * Integration test: real SQL (better-sqlite3) + the real repositories, reconcile and engine.
 * Run `npm run db:generate` first so ./drizzle contains the latest migrations.
 */
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';

jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
jest.mock('@/sync/syncService', () => ({ requestSync: jest.fn() }));
jest.mock('@/db/client', () => {
  const Database = require('better-sqlite3');
  const { drizzle } = require('drizzle-orm/better-sqlite3');
  const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
  const s = require('@/db/schema');
  const sqlite = new Database(':memory:');
  const raw = drizzle(sqlite, { schema: s });
  migrate(raw, { migrationsFolder: './drizzle' });
  const db = Object.assign(raw, {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      sqlite.exec('BEGIN');
      try {
        const r = await fn(raw);
        sqlite.exec('COMMIT');
        return r;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  });
  return { db };
});

import { db } from '@/db/client';
import {
  createMatch,
  saveXi,
  setToss,
  startFirstInnings,
  startSecondInnings,
} from '@/features/matches/matchRepository';
import {
  editDelivery,
  endInningsManually,
  recordDelivery,
  ScoringRejected,
  undoLastDelivery,
} from '@/features/scoring/deliveryRepository';
import { byeBall, noBallBall, runsBall, wicketBall, type InningsState } from '@/core/scoring';

const USER = 'user-1';
const A = 'team-a';
const B = 'team-b';
const pa = Array.from({ length: 11 }, (_, i) => `a${i + 1}`);
const pb = Array.from({ length: 11 }, (_, i) => `b${i + 1}`);
const t = '2026-10-10T10:00:00.000Z';

async function seed() {
  for (const [id, name, short] of [
    [A, 'Alpha CC', 'ALP'],
    [B, 'Beta XI', 'BET'],
  ] as const)
    await db
      .insert(schema.teams)
      .values({ id, name, shortName: short, createdBy: USER, createdAt: t, updatedAt: t });
  for (const id of [...pa, ...pb])
    await db
      .insert(schema.players)
      .values({ id, name: id, role: 'BAT', createdBy: USER, createdAt: t, updatedAt: t });
}

const who = (s: InningsState, bowler?: string) => ({
  strikerId: s.strikerId,
  nonStrikerId: s.nonStrikerId,
  bowlerId: (s.bowlerId ?? bowler)!,
});

async function setupMatch(overs = 1) {
  const matchId = await createMatch(
    {
      teamAId: A,
      teamBId: B,
      format: 'CUSTOM',
      oversPerInnings: overs,
      maxOversPerBowler: 1,
      freeHitEnabled: true,
      scheduledAt: t,
    },
    USER,
  );
  await saveXi(
    matchId,
    A,
    pa.map((playerId) => ({ playerId })),
  );
  await saveXi(
    matchId,
    B,
    pb.map((playerId) => ({ playerId })),
  );
  await setToss(matchId, A, 'bat');
  await startFirstInnings(matchId, { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b11' }, USER);
  const innings = await db.select().from(schema.innings).where(eq(schema.innings.matchId, matchId));
  return { matchId, i1: innings[0]!.id };
}
const getMatch = async (id: string) =>
  (await db.select().from(schema.matches).where(eq(schema.matches.id, id)))[0]!;

describe('full scoring flow on real SQL', () => {
  beforeAll(seed);

  it('scores a one-over match end to end: innings break → chase → result → undo → edit', async () => {
    const { matchId, i1 } = await setupMatch();
    expect((await getMatch(matchId)).status).toBe('live');

    // first innings: 1, 4, 0, 6, 2, 1  = 14
    let s = { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b11' } as unknown as InningsState;
    for (const r of [1, 4, 0, 6, 2, 1]) s = await recordDelivery(i1, runsBall(who(s), r), USER);
    expect(s).toMatchObject({ runs: 14, status: 'completed', endReason: 'OVERS_COMPLETE' });
    expect((await getMatch(matchId)).status).toBe('innings_break');

    // cannot score after the innings ended
    await expect(recordDelivery(i1, runsBall(who(s, 'b10'), 1), USER)).rejects.toThrow(
      ScoringRejected,
    );

    // second innings: target 15
    await startSecondInnings(
      matchId,
      { strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a11' },
      USER,
    );
    const i2 = (
      await db.select().from(schema.innings).where(eq(schema.innings.matchId, matchId))
    ).find((i) => i.inningsNo === 2)!;
    expect(i2.target).toBe(15);
    expect(i2.battingTeamId).toBe(B);
    expect((await getMatch(matchId)).status).toBe('live');

    let c = { strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a11' } as unknown as InningsState;
    for (const r of [4, 6, 4]) c = await recordDelivery(i2.id, runsBall(who(c), r), USER);
    expect((await getMatch(matchId)).status).toBe('live');
    c = await recordDelivery(i2.id, runsBall(who(c), 1), USER);
    expect(c).toMatchObject({ runs: 15, status: 'completed', endReason: 'TARGET_REACHED' });
    let m = await getMatch(matchId);
    expect(m).toMatchObject({
      status: 'completed',
      resultType: 'win',
      winnerTeamId: B,
      marginType: 'wickets',
      marginValue: 10,
      resultSummary: 'Beta XI won by 10 wickets',
    });

    // undo the winning single → match is live again, no result
    await undoLastDelivery(i2.id, USER);
    m = await getMatch(matchId);
    expect(m).toMatchObject({ status: 'live', resultType: null, resultSummary: null });
    expect(
      (await db.select().from(schema.innings).where(eq(schema.innings.id, i2.id)))[0],
    ).toMatchObject({ status: 'in_progress', endReason: null });

    // an edit that breaks later balls is rejected; a valid edit is audited and recalculates the result
    const rows = await db
      .select()
      .from(schema.deliveries)
      .where(eq(schema.deliveries.inningsId, i2.id));
    const first = rows.sort((a, b) => a.seq - b.seq)[0]!;
    await expect(
      editDelivery(
        first.id,
        wicketBall(
          { strikerId: 'b1', nonStrikerId: 'b2', bowlerId: 'a11' },
          { type: 'BOWLED', playerOutId: 'b1', incomingBatterId: 'b3' },
        ),
        'wrong',
        USER,
      ),
    ).rejects.toThrow(/Ball 2/);
    const last = rows.sort((a, b) => b.seq - a.seq).find((r) => !r.voided)!; // third ball (4)
    await editDelivery(
      last.id,
      runsBall(
        { strikerId: last.strikerId, nonStrikerId: last.nonStrikerId, bowlerId: last.bowlerId },
        6,
      ),
      'it was a six',
      USER,
    );
    const audit = await db.select().from(schema.scoreCorrections);
    expect(audit.map((a) => a.action).sort()).toEqual(['EDIT', 'UNDO']);

    // finish the chase with the corrected score: 4+6+6 = 16 ≥ 15 → complete after the third ball already
    m = await getMatch(matchId);
    expect(m.status).toBe('completed');
    expect(m.resultSummary).toBe('Beta XI won by 10 wickets');

    // every change was queued for sync, parents before children
    const outbox = await db.select().from(schema.syncOutbox);
    const entities = [...new Set(outbox.map((o) => o.entity))];
    expect(entities).toEqual(
      expect.arrayContaining([
        'matches',
        'playing_xi',
        'innings',
        'deliveries',
        'score_corrections',
      ]),
    );
    expect(outbox[0]!.entity).toBe('matches');
  });

  it('wides, no-balls and wickets are stored and replayed correctly', async () => {
    const { i1 } = await setupMatch(5);
    let s = { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b11' } as unknown as InningsState;
    s = await recordDelivery(i1, noBallBall(who(s), { batRuns: 4, boundary: true }), USER);
    s = await recordDelivery(i1, byeBall(who(s), 1), USER);
    s = await recordDelivery(
      i1,
      wicketBall(who(s), { type: 'RUN_OUT', playerOutId: s.nonStrikerId, incomingBatterId: 'a3' }),
      USER,
    ); // free hit: run out allowed
    expect(s).toMatchObject({ runs: 6, wickets: 1, legalBalls: 2 });
    await expect(
      recordDelivery(
        i1,
        wicketBall(who(s), { type: 'BOWLED', playerOutId: s.strikerId, incomingBatterId: 'a4' }),
        USER,
      ),
    ).resolves.toMatchObject({ wickets: 2 }); // free hit was cleared by the legal bye
  });

  it('a manually ended innings stays ended; undo reopens it', async () => {
    const { matchId, i1 } = await setupMatch(5);
    const s = { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b11' } as unknown as InningsState;
    await recordDelivery(i1, runsBall(who(s), 2), USER);
    await endInningsManually(i1, 'DECLARED');
    expect((await getMatch(matchId)).status).toBe('innings_break');
    await undoLastDelivery(i1, USER);
    expect((await getMatch(matchId)).status).toBe('live');
  });

  it('refuses to start without toss / full XI and rejects bad openers', async () => {
    const matchId = await createMatch(
      {
        teamAId: A,
        teamBId: B,
        format: 'T20',
        oversPerInnings: 20,
        maxOversPerBowler: 4,
        freeHitEnabled: true,
        scheduledAt: t,
      },
      USER,
    );
    await expect(
      startFirstInnings(matchId, { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' }, USER),
    ).rejects.toThrow('toss');
    await setToss(matchId, B, 'bowl');
    await expect(
      startFirstInnings(matchId, { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' }, USER),
    ).rejects.toThrow('Select exactly 11');
    await saveXi(
      matchId,
      A,
      pa.map((playerId) => ({ playerId })),
    );
    await saveXi(
      matchId,
      B,
      pb.map((playerId) => ({ playerId })),
    );
    await expect(
      startFirstInnings(matchId, { strikerId: 'a1', nonStrikerId: 'a1', bowlerId: 'b1' }, USER),
    ).rejects.toThrow('two different');
    await expect(
      startFirstInnings(matchId, { strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'a3' }, USER),
    ).rejects.toThrow('bowling XI');
  });
});
