import { formatOvers } from './engine';
import type { BatterState, BowlerState, InningsState, MatchConfig } from './types';

const round = (n: number, dp: number): number => Math.round(n * 10 ** dp) / 10 ** dp;

/** Runs per over (CRR). 0 when no legal balls yet. */
export function runRate(runs: number, legalBalls: number, ballsPerOver: number): number {
  return legalBalls === 0 ? 0 : round((runs * ballsPerOver) / legalBalls, 2);
}

export function strikeRate(runs: number, balls: number): number {
  return balls === 0 ? 0 : round((runs * 100) / balls, 1);
}

export function economy(runs: number, legalBalls: number, ballsPerOver: number): number {
  return legalBalls === 0 ? 0 : round((runs * ballsPerOver) / legalBalls, 2);
}

/** "3.2-1-24-2" (overs-maidens-runs-wickets) — the Stitch bowler figure string. */
export function bowlerFigures(b: BowlerState, ballsPerOver: number): string {
  return `${formatOvers(b.legalBalls, ballsPerOver)}-${b.maidens}-${b.runs}-${b.wickets}`;
}

export interface ChaseInfo {
  target: number;
  runsNeeded: number;
  ballsRemaining: number;
  requiredRate: number;
  currentRate: number;
}

export function chaseInfo(s: InningsState, cfg: MatchConfig): ChaseInfo | null {
  if (s.target === null) return null;
  const totalBalls = cfg.oversPerInnings * cfg.ballsPerOver;
  const ballsRemaining = Math.max(0, totalBalls - s.legalBalls);
  const runsNeeded = Math.max(0, s.target - s.runs);
  return {
    target: s.target,
    runsNeeded,
    ballsRemaining,
    requiredRate:
      ballsRemaining === 0 ? 0 : round((runsNeeded * cfg.ballsPerOver) / ballsRemaining, 2),
    currentRate: runRate(s.runs, s.legalBalls, cfg.ballsPerOver),
  };
}

/** Balls of the over in progress (including wides/no-balls), for the Stitch "Over N" strip. */
export function currentOverView(s: InningsState, cfg: MatchConfig) {
  const overNo = Math.floor(s.legalBalls / cfg.ballsPerOver);
  // After an over ends, show the over that just finished until the first ball of the next one is bowled.
  const showNo =
    s.bowlerId === null && s.legalBalls > 0 && s.status === 'in_progress' ? overNo - 1 : overNo;
  const balls = s.balls.filter((b) => b.overNo === showNo);
  return { overNumber: showNo + 1, balls, runs: balls.reduce((n, b) => n + b.runs, 0) };
}

export interface BatterRow extends BatterState {
  strikeRate: number;
  onStrike: boolean;
}

export function batterRow(s: InningsState, id: string): BatterRow | null {
  const b = s.batters[id];
  if (!b) return null;
  return { ...b, strikeRate: strikeRate(b.runs, b.balls), onStrike: s.strikerId === id };
}

export function scorecardBatters(s: InningsState): BatterRow[] {
  return Object.values(s.batters)
    .sort((x, y) => x.order - y.order)
    .map((b) => ({
      ...b,
      strikeRate: strikeRate(b.runs, b.balls),
      onStrike: s.strikerId === b.playerId && !b.out,
    }));
}

export function scorecardBowlers(s: InningsState, cfg: MatchConfig) {
  return Object.values(s.bowlers)
    .filter((b) => b.legalBalls > 0 || b.runs > 0)
    .map((b) => ({
      ...b,
      overs: formatOvers(b.legalBalls, cfg.ballsPerOver),
      economy: economy(b.runs, b.legalBalls, cfg.ballsPerOver),
    }));
}

/** Partnership split for the Stitch bar (percentages of runs by each batter; extras shown separately). */
export function partnershipView(s: InningsState) {
  const p = s.partnership;
  const aRuns = p.contrib[p.batterAId] ?? 0;
  const bRuns = p.contrib[p.batterBId] ?? 0;
  const bat = aRuns + bRuns;
  return {
    runs: p.runs,
    balls: p.balls,
    a: { id: p.batterAId, runs: aRuns, pct: bat === 0 ? 50 : Math.round((aRuns / bat) * 100) },
    b: {
      id: p.batterBId,
      runs: bRuns,
      pct: bat === 0 ? 50 : 100 - Math.round((aRuns / bat) * 100),
    },
  };
}
