import * as Crypto from 'expo-crypto';
import { and, desc, eq } from 'drizzle-orm';
import {
  applyDelivery,
  auditInnings,
  replay,
  validateDelivery,
  type BallInput,
  type Delivery,
  type InningsState,
  type ValidateOptions,
} from '@/core/scoring';
import { db, type Tx } from '@/db/client';
import { enqueue } from '@/db/outbox';
import { deliveries, innings, matches, playingXi, scoreCorrections } from '@/db/schema';
import { requestSync } from '@/sync/syncService';
import { configOf, deliveryFields, rowToDelivery, setupOf, type DeliveryRow } from './mappers';
import { reconcileMatch } from './reconcile';

export class ScoringRejected extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ScoringRejected';
  }
}

const now = () => new Date().toISOString();

async function load(tx: Tx, inningsId: string) {
  const [inn] = await tx.select().from(innings).where(eq(innings.id, inningsId));
  if (!inn) throw new ScoringRejected('NOT_FOUND', 'Innings not found.');
  const [m] = await tx.select().from(matches).where(eq(matches.id, inn.matchId));
  if (!m) throw new ScoringRejected('NOT_FOUND', 'Match not found.');
  const xi = await tx.select().from(playingXi).where(eq(playingXi.matchId, m.id));
  const rows = await tx.select().from(deliveries).where(eq(deliveries.inningsId, inningsId));
  const setup = setupOf(inn, xi);
  const cfg = configOf(m);
  const list: Delivery[] = rows.map((r) => ({
    ...rowToDelivery(r),
    inningsNo: inn.inningsNo as 1 | 2,
  }));
  return { inn, m, rows, setup, cfg, list };
}

const fullRow = (r: DeliveryRow, patch: Partial<DeliveryRow>): DeliveryRow => ({ ...r, ...patch });

/** Records one delivery (or a dead-ball event). Throws ScoringRejected with the engine's message if it is not valid. */
export async function recordDelivery(
  inningsId: string,
  input: BallInput,
  userId: string,
  opts: ValidateOptions = {},
): Promise<InningsState> {
  const state = await db.transaction(async (tx) => {
    const { inn, m, rows, setup, cfg, list } = await load(tx, inningsId);
    if (inn.status === 'completed')
      throw new ScoringRejected('INNINGS_COMPLETE', 'The innings is already complete.');
    const current = replay(cfg, setup, list);
    const seq = rows.reduce((n, r) => Math.max(n, r.seq), 0) + 1;
    const d: Delivery = {
      id: Crypto.randomUUID(),
      inningsNo: inn.inningsNo as 1 | 2,
      seq,
      ...input,
    };
    const [problem] = validateDelivery(current, cfg, setup, d, opts);
    if (problem) throw new ScoringRejected(problem.code, problem.message);

    const t = now();
    const row: DeliveryRow = {
      id: d.id,
      inningsId,
      seq,
      ...deliveryFields(input),
      voided: false,
      version: 1,
      deviceId: null,
      createdBy: userId,
      createdAt: t,
      updatedAt: t,
    };
    await tx.insert(deliveries).values(row);
    await enqueue(tx, 'deliveries', row.id, row);
    await reconcileMatch(tx, m.id);
    return applyDelivery(current, cfg, d);
  });
  requestSync();
  return state;
}

/** Undo = void the latest active delivery (never deleted). Reopens an innings that had ended. */
export async function undoLastDelivery(
  inningsId: string,
  userId: string,
  reason = 'Undo',
): Promise<void> {
  await db.transaction(async (tx) => {
    const { inn, m, rows } = await load(tx, inningsId);
    const later = await tx
      .select()
      .from(innings)
      .where(and(eq(innings.matchId, m.id)));
    for (const other of later.filter((o) => o.inningsNo > inn.inningsNo)) {
      const next = await tx.select().from(deliveries).where(eq(deliveries.inningsId, other.id));
      if (next.some((r) => !r.voided))
        throw new ScoringRejected('UNDO_BLOCKED', 'Undo the later innings first.');
    }
    const last = rows.filter((r) => !r.voided).sort((a, b) => b.seq - a.seq)[0];
    if (!last) throw new ScoringRejected('NOTHING_TO_UNDO', 'There is nothing to undo.');
    const t = now();
    const next = fullRow(last, { voided: true, version: last.version + 1, updatedAt: t });
    await tx
      .update(deliveries)
      .set({ voided: true, version: next.version, updatedAt: t })
      .where(eq(deliveries.id, last.id));
    await enqueue(tx, 'deliveries', last.id, next);
    const corr = {
      id: Crypto.randomUUID(),
      deliveryId: last.id,
      action: 'UNDO' as const,
      oldJson: last,
      newJson: { voided: true },
      reason,
      editedBy: userId,
      editedAt: t,
      createdAt: t,
      updatedAt: t,
    };
    await tx.insert(scoreCorrections).values(corr);
    await enqueue(tx, 'score_corrections', corr.id, corr);
    await reconcileMatch(tx, m.id, { reopenManual: true });
  });
  requestSync();
}

/**
 * Edits an earlier delivery. The whole innings is re-validated with the edit applied; if any later ball would become
 * invalid the edit is rejected (the message names the ball). Every edit is audited with a reason.
 */
export async function editDelivery(
  deliveryId: string,
  input: BallInput,
  reason: string,
  userId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(deliveries).where(eq(deliveries.id, deliveryId));
    if (!row) throw new ScoringRejected('NOT_FOUND', 'Delivery not found.');
    const { m, rows, setup, cfg, list } = await load(tx, row.inningsId);
    const original = list.find((d) => d.id === deliveryId);
    if (!original) throw new ScoringRejected('NOT_FOUND', 'Delivery not found.');
    // An edit REPLACES the ball's content (it is not merged with the old one).
    const edited: Delivery = {
      id: deliveryId,
      inningsNo: original.inningsNo,
      seq: original.seq,
      kind: 'BALL',
      isBoundary: false,
      extra: null,
      wicket: null,
      voided: false,
      ...input,
    };
    const problems = auditInnings(
      cfg,
      setup,
      list.map((d) => (d.id === deliveryId ? edited : d)),
    );
    const first = problems[0];
    if (first) {
      const err = first.errors[0]!;
      throw new ScoringRejected(err.code, `Ball ${first.seq}: ${err.message}`);
    }
    const t = now();
    const next = fullRow(row, { ...deliveryFields(input), version: row.version + 1, updatedAt: t });
    await tx
      .update(deliveries)
      .set({ ...deliveryFields(input), version: next.version, updatedAt: t })
      .where(eq(deliveries.id, deliveryId));
    await enqueue(tx, 'deliveries', deliveryId, next);
    const corr = {
      id: Crypto.randomUUID(),
      deliveryId,
      action: 'EDIT' as const,
      oldJson: row,
      newJson: next,
      reason,
      editedBy: userId,
      editedAt: t,
      createdAt: t,
      updatedAt: t,
    };
    await tx.insert(scoreCorrections).values(corr);
    await enqueue(tx, 'score_corrections', corr.id, corr);
    void rows;
    await reconcileMatch(tx, m.id);
  });
  requestSync();
}

/** Declaration / forced end of an innings. */
export async function endInningsManually(
  inningsId: string,
  reason: 'DECLARED' | 'MANUAL',
): Promise<void> {
  await db.transaction(async (tx) => {
    const { inn, m } = await load(tx, inningsId);
    const t = now();
    await tx
      .update(innings)
      .set({ status: 'completed', endReason: reason, updatedAt: t })
      .where(eq(innings.id, inningsId));
    await enqueue(tx, 'innings', inningsId, {
      ...inn,
      status: 'completed',
      endReason: reason,
      updatedAt: t,
    });
    await reconcileMatch(tx, m.id);
  });
  requestSync();
}

/** The most recent deliveries first (for the "edit a ball" list). */
export async function recentDeliveries(inningsId: string, limit = 30): Promise<DeliveryRow[]> {
  return db
    .select()
    .from(deliveries)
    .where(and(eq(deliveries.inningsId, inningsId), eq(deliveries.voided, false)))
    .orderBy(desc(deliveries.seq))
    .limit(limit);
}
