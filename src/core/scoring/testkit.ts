import type { Delivery, InningsSetup, MatchConfig } from './types';

export const T20: MatchConfig = {
  oversPerInnings: 20,
  ballsPerOver: 6,
  maxOversPerBowler: 4,
  freeHitEnabled: true,
  playersPerSide: 11,
};
export const SHORT: MatchConfig = {
  oversPerInnings: 2,
  ballsPerOver: 6,
  maxOversPerBowler: 1,
  freeHitEnabled: true,
  playersPerSide: 4,
};

export const bat = Array.from({ length: 11 }, (_, i) => `b${i + 1}`);
export const bowl = Array.from({ length: 11 }, (_, i) => `w${i + 1}`);

export const setup = (over: Partial<InningsSetup> = {}): InningsSetup => ({
  inningsNo: 1,
  battingTeamId: 'A',
  bowlingTeamId: 'B',
  battingXI: bat,
  bowlingXI: bowl,
  openingStrikerId: 'b1',
  openingNonStrikerId: 'b2',
  openingBowlerId: 'w1',
  target: null,
  ...over,
});

let n = 0;
/** Delivery builder; attribution defaults are filled in by the caller. */
export const dv = (
  p: Partial<Delivery> & Pick<Delivery, 'strikerId' | 'nonStrikerId' | 'bowlerId'>,
): Delivery => ({
  id: `d${++n}`,
  inningsNo: 1,
  seq: n,
  runsOffBat: 0,
  ...p,
});
