import { maxWickets, type InningsState, type MatchConfig } from './types';

export type MatchResult =
  | { type: 'WIN'; winner: 'FIRST' | 'SECOND'; marginType: 'RUNS' | 'WICKETS'; margin: number }
  | { type: 'TIE' };

/** null while the match is still in progress. (DLS / super over are out of scope.) */
export function computeResult(
  cfg: MatchConfig,
  first: InningsState,
  second: InningsState | null,
): MatchResult | null {
  if (first.status !== 'completed' || !second) return null;
  if (second.runs > first.runs) {
    return {
      type: 'WIN',
      winner: 'SECOND',
      marginType: 'WICKETS',
      margin: maxWickets(cfg) - second.wickets,
    };
  }
  if (second.status !== 'completed') return null;
  if (second.runs === first.runs) return { type: 'TIE' };
  return { type: 'WIN', winner: 'FIRST', marginType: 'RUNS', margin: first.runs - second.runs };
}

/** "St. Jude CC won by 23 runs" / "Northwood CC won by 5 wickets" / "Match tied". */
export function resultText(
  result: MatchResult | null,
  names: { first: string; second: string },
): string {
  if (!result) return 'Match in progress';
  if (result.type === 'TIE') return 'Match tied';
  const who = result.winner === 'FIRST' ? names.first : names.second;
  const unit = result.marginType === 'RUNS' ? 'run' : 'wicket';
  return `${who} won by ${result.margin} ${unit}${result.margin === 1 ? '' : 's'}`;
}
