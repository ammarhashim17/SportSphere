import type { Delivery, InningsSetup, MatchConfig } from '@/core/scoring';
import type { deliveries, innings, matches, playingXi } from '@/db/schema';

export type MatchRow = typeof matches.$inferSelect;
export type InningsRow = typeof innings.$inferSelect;
export type DeliveryRow = typeof deliveries.$inferSelect;
export type XiRow = typeof playingXi.$inferSelect;

export const configOf = (m: MatchRow): MatchConfig => ({
  oversPerInnings: m.oversPerInnings,
  ballsPerOver: m.ballsPerOver,
  maxOversPerBowler: m.maxOversPerBowler,
  freeHitEnabled: m.freeHitEnabled,
  playersPerSide: m.playersPerSide,
});

/** Batting/bowling XIs are ordered by batting order (active rows only). */
export function setupOf(i: InningsRow, xi: readonly XiRow[]): InningsSetup {
  const side = (teamId: string) =>
    xi
      .filter((x) => x.active && x.teamId === teamId)
      .sort((a, b) => a.battingOrder - b.battingOrder)
      .map((x) => x.playerId);
  return {
    inningsNo: i.inningsNo as 1 | 2,
    battingTeamId: i.battingTeamId,
    bowlingTeamId: i.bowlingTeamId,
    battingXI: side(i.battingTeamId),
    bowlingXI: side(i.bowlingTeamId),
    openingStrikerId: i.openingStrikerId,
    openingNonStrikerId: i.openingNonStrikerId,
    openingBowlerId: i.openingBowlerId,
    target: i.target,
  };
}

export const rowToDelivery = (r: DeliveryRow): Delivery => ({
  id: r.id,
  inningsNo: 1, // set by the caller (the row only knows its innings id)
  seq: r.seq,
  kind: r.kind,
  strikerId: r.strikerId,
  nonStrikerId: r.nonStrikerId,
  bowlerId: r.bowlerId,
  runsOffBat: r.runsOffBat,
  isBoundary: r.isBoundary,
  extra: r.extraType ? { type: r.extraType, runs: r.extraRuns, subType: r.extraSubType } : null,
  wicket: r.wicketType
    ? {
        type: r.wicketType,
        playerOutId: r.playerOutId ?? '',
        fielderId: r.fielderId,
        incomingBatterId: r.incomingBatterId,
        incomingAt: r.incomingAt,
      }
    : null,
  voided: r.voided,
});

export const deliveryFields = (d: Omit<Delivery, 'id' | 'seq' | 'inningsNo'>) => ({
  kind: d.kind ?? 'BALL',
  strikerId: d.strikerId,
  nonStrikerId: d.nonStrikerId,
  bowlerId: d.bowlerId,
  runsOffBat: d.runsOffBat,
  isBoundary: !!d.isBoundary,
  extraType: d.extra?.type ?? null,
  extraRuns: d.extra?.runs ?? 0,
  extraSubType: d.extra?.subType ?? null,
  wicketType: d.wicket?.type ?? null,
  playerOutId: d.wicket?.playerOutId ?? null,
  fielderId: d.wicket?.fielderId ?? null,
  incomingBatterId: d.wicket?.incomingBatterId ?? null,
  incomingAt: d.wicket?.incomingAt ?? null,
});
