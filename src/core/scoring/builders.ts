import type { Delivery, WicketType } from './types';

/** Everything the UI decides; the repository adds id, seq and inningsNo. */
export type BallInput = Omit<Delivery, 'id' | 'seq' | 'inningsNo'>;

export interface Who {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}

/** Keypad 0–6. The "4" and "6" keys are boundaries (the Stitch keypad has no "ran four" key). */
export const runsBall = (w: Who, runs: number): BallInput => ({
  ...w,
  runsOffBat: runs,
  isBoundary: runs === 4 || runs === 6,
});

/** Wide: totalRuns includes the 1-run penalty (Wd +1 → 1; wide and 2 run → 3). */
export const wideBall = (w: Who, totalRuns = 1): BallInput => ({
  ...w,
  runsOffBat: 0,
  extra: { type: 'WIDE', runs: totalRuns },
});

/** No-ball: bat runs go to the batter; byes/leg-byes off the no-ball are optional. */
export const noBallBall = (
  w: Who,
  opts: {
    batRuns?: number;
    boundary?: boolean;
    nonBat?: { type: 'BYE' | 'LEG_BYE'; runs: number };
  } = {},
): BallInput => ({
  ...w,
  runsOffBat: opts.batRuns ?? 0,
  isBoundary: !!opts.boundary && (opts.batRuns === 4 || opts.batRuns === 6),
  extra: opts.nonBat
    ? { type: 'NO_BALL', runs: 1 + opts.nonBat.runs, subType: opts.nonBat.type }
    : { type: 'NO_BALL', runs: 1 },
});

export const byeBall = (w: Who, runs: number): BallInput => ({
  ...w,
  runsOffBat: 0,
  extra: { type: 'BYE', runs },
});
export const legByeBall = (w: Who, runs: number): BallInput => ({
  ...w,
  runsOffBat: 0,
  extra: { type: 'LEG_BYE', runs },
});

export interface WicketChoice {
  type: WicketType;
  playerOutId: string;
  fielderId?: string | null;
  incomingBatterId?: string | null;
  incomingAt?: 'STRIKER' | 'NON_STRIKER' | null;
  /** Runs completed before the dismissal (run out). */
  runsOffBat?: number;
  /** The ball was also a wide / no-ball (stumped or run out on a wide, run out on a no-ball). */
  onExtra?: 'WIDE' | 'NO_BALL' | null;
}

export const wicketBall = (w: Who, c: WicketChoice): BallInput => ({
  ...w,
  runsOffBat: c.runsOffBat ?? 0,
  extra:
    c.onExtra === 'WIDE'
      ? { type: 'WIDE', runs: 1 }
      : c.onExtra === 'NO_BALL'
        ? { type: 'NO_BALL', runs: 1 }
        : null,
  wicket: {
    type: c.type,
    playerOutId: c.playerOutId,
    fielderId: c.fielderId ?? null,
    incomingBatterId: c.incomingBatterId ?? null,
    incomingAt: c.incomingAt ?? null,
  },
});

/** Retirement between balls (dead-ball event). */
export const retireEvent = (
  w: Who,
  c: { type: 'RETIRED_HURT' | 'RETIRED_OUT'; playerOutId: string; incomingBatterId: string | null },
): BallInput => ({
  ...w,
  kind: 'DEAD',
  runsOffBat: 0,
  wicket: {
    type: c.type,
    playerOutId: c.playerOutId,
    fielderId: null,
    incomingBatterId: c.incomingBatterId,
    incomingAt: null,
  },
});
