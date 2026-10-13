// Pure TypeScript — no React / Expo imports (enforced by ESLint).

export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE';

export type WicketType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'OBSTRUCTING'
  | 'HIT_TWICE'
  | 'RETIRED_HURT'
  | 'RETIRED_OUT';

/** Wickets credited to the bowler (MCC convention). Run out, obstructing, hit-twice and retirements are NOT. */
export const BOWLER_CREDITED: readonly WicketType[] = [
  'BOWLED',
  'CAUGHT',
  'LBW',
  'STUMPED',
  'HIT_WICKET',
];

export interface ExtraInfo {
  type: ExtraType;
  /**
   * Total runs credited to the extra, INCLUDING the 1-run penalty for wides and no-balls.
   *  WIDE   : 1 + runs actually run            (runsOffBat must be 0)
   *  NO_BALL: 1 + byes/leg-byes run (if subType) (bat runs go in runsOffBat)
   *  BYE / LEG_BYE: runs run                    (runsOffBat must be 0)
   */
  runs: number;
  /** NO_BALL only: the non-bat runs scored off the no-ball are byes or leg-byes. */
  subType?: 'BYE' | 'LEG_BYE' | null;
}

export interface WicketInfo {
  type: WicketType;
  playerOutId: string;
  fielderId?: string | null;
  /** Required unless this wicket ends the innings. */
  incomingBatterId?: string | null;
  /** Optional override of the end the incoming batter takes. Default: the end of the dismissed batter. */
  incomingAt?: 'STRIKER' | 'NON_STRIKER' | null;
}

export interface Delivery {
  id: string;
  inningsNo: 1 | 2;
  seq: number;
  /** 'BALL' (default) = a bowled delivery. 'DEAD' = non-delivery event (retirement). */
  kind?: 'BALL' | 'DEAD';
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  runsOffBat: number;
  /** True when the ball reached the boundary (4 or 6). A 4 that was run is isBoundary=false. */
  isBoundary?: boolean;
  extra?: ExtraInfo | null;
  wicket?: WicketInfo | null;
  voided?: boolean;
}

export interface MatchConfig {
  oversPerInnings: number;
  ballsPerOver: number;
  /** 0 = unlimited */
  maxOversPerBowler: number;
  freeHitEnabled: boolean;
  playersPerSide: number;
}

export const maxWickets = (cfg: MatchConfig): number => cfg.playersPerSide - 1;

export interface InningsSetup {
  inningsNo: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  battingXI: string[];
  bowlingXI: string[];
  openingStrikerId: string;
  openingNonStrikerId: string;
  openingBowlerId: string | null;
  /** Runs needed to win (first innings total + 1). null in the first innings. */
  target: number | null;
}

export interface Dismissal {
  type: WicketType;
  bowlerId: string | null;
  fielderId: string | null;
}

export interface BatterState {
  playerId: string;
  order: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  retiredHurt: boolean;
  dismissal: Dismissal | null;
}

export interface BowlerState {
  playerId: string;
  legalBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
  wides: number;
  noBalls: number;
}

export type BallKind = 'dot' | 'run' | 'four' | 'six' | 'wicket' | 'extra';

export interface BallView {
  deliveryId: string;
  seq: number;
  overNo: number;
  /** e.g. "14.3" — legal balls so far in the over, shown after the ball. */
  overBall: string;
  label: string;
  kind: BallKind;
  runs: number;
  legal: boolean;
  bowlerId: string;
  strikerId: string;
}

export interface FallOfWicket {
  wicketNo: number;
  runs: number;
  playerId: string;
  over: string;
}

export interface Partnership {
  batterAId: string;
  batterBId: string;
  runs: number;
  balls: number;
  extras: number;
  contrib: Record<string, number>;
  endedBy: 'WICKET' | 'RETIRED' | null;
  wicketNo: number | null;
}

export type EndReason = 'ALL_OUT' | 'OVERS_COMPLETE' | 'TARGET_REACHED' | 'DECLARED' | 'MANUAL';

export interface Extras {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  total: number;
}

export interface InningsState {
  inningsNo: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  target: number | null;
  status: 'in_progress' | 'completed';
  endReason: EndReason | null;

  runs: number;
  wickets: number;
  legalBalls: number;
  extras: Extras;

  strikerId: string;
  nonStrikerId: string;
  /** Current bowler; null when a new bowler must be chosen (after each over). */
  bowlerId: string | null;
  lastOverBowlerId: string | null;
  freeHit: boolean;

  batters: Record<string, BatterState>;
  battingOrder: string[];
  bowlers: Record<string, BowlerState>;
  /** Runs/balls charged per bowler within the over in progress (for maidens). */
  overLedger: Record<string, { balls: number; runs: number }>;

  balls: BallView[];
  fow: FallOfWicket[];
  partnership: Partnership;
  partnerships: Partnership[];
  /** Deliveries after the innings ended (e.g. after editing an earlier ball). Should be 0. */
  ignoredDeliveries: number;
}

export type ScoringErrorCode =
  | 'INNINGS_COMPLETE'
  | 'INVALID_RUNS'
  | 'INVALID_EXTRA'
  | 'INVALID_BOUNDARY'
  | 'BATTER_NOT_AT_CREASE'
  | 'PLAYER_NOT_IN_XI'
  | 'BOWLER_MISMATCH'
  | 'BOWLER_CONSECUTIVE'
  | 'BOWLER_QUOTA'
  | 'INVALID_WICKET'
  | 'WICKET_NOT_ALLOWED'
  | 'INCOMING_REQUIRED'
  | 'INCOMING_INVALID'
  | 'INVALID_DEAD_BALL';

export class ScoringError extends Error {
  constructor(
    public readonly code: ScoringErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ScoringError';
  }
}

export interface ValidateOptions {
  /** Allow a different bowler mid-over (injury). */
  allowBowlerChange?: boolean;
  /** Allow consecutive overs / quota overrides (scorer confirmed the warning). */
  ignoreBowlerRules?: boolean;
}
