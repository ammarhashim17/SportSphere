import { desc, inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { formatOvers } from '@/core/scoring';
import { db } from '@/db/client';
import { matches } from '@/db/schema';
import type { STITCH_HOME_FIXTURES } from '@/fixtures/stitchHome';
import { useLiveScoring } from '@/features/scoring/useLiveScoring';

export type HomeLiveMatch = (typeof STITCH_HOME_FIXTURES)['liveMatch'];

/** The match in progress on this device, in exactly the shape the Stitch Home "Live" card renders (null if none). */
export function useHomeLiveMatch(): HomeLiveMatch | null {
  const { data } = useLiveQuery(
    db
      .select()
      .from(matches)
      .where(inArray(matches.status, ['live', 'innings_break']))
      .orderBy(desc(matches.updatedAt))
      .limit(1),
  );
  const id = data[0]?.id ?? '';
  const live = useLiveScoring(id);
  if (!id || !live.ready || !live.current || !live.state) return null;

  const { match, cfg, state, current, chase, firstState } = live;
  const bat = live.team(current.battingTeamId);
  const bowl = live.team(current.bowlingTeamId);
  const other =
    current.inningsNo === 2 && firstState
      ? {
          score: `${firstState.runs}/${firstState.wickets}`,
          overs: `${formatOvers(firstState.legalBalls, cfg.ballsPerOver)} ov`,
          subtext: 'Innings Completed',
        }
      : { score: '—', overs: '', subtext: 'Yet to bat' };
  const batters = [state.strikerId, state.nonStrikerId].map((pid, i) => {
    const b = state.batters[pid];
    return {
      name: live.playerName(pid),
      runs: `${b?.runs ?? 0}${i === 0 ? '*' : ''}`,
      balls: String(b?.balls ?? 0),
    };
  });

  return {
    id: match.id,
    tournament: [match.format, match.stage, match.venue].filter(Boolean).join(' • '),
    status: 'LIVE',
    team1: {
      name: bat?.name ?? 'Team',
      shortName: bat?.shortName ?? '',
      colour: bat?.colour ?? '#0d5c3a',
      score: `${state.runs}/${state.wickets}`,
      overs: `${formatOvers(state.legalBalls, cfg.ballsPerOver)} / ${cfg.oversPerInnings} ov`,
      isBatting: true,
      target: chase ? `Target ${chase.target}` : '',
    },
    team2: {
      name: bowl?.name ?? 'Team',
      shortName: bowl?.shortName ?? '',
      colour: bowl?.colour ?? '#213145',
      score: other.score,
      overs: other.overs,
      isBatting: false,
      subtext: other.subtext,
    },
    situation: {
      runsNeeded: chase
        ? `Need ${chase.runsNeeded} runs off ${chase.ballsRemaining} balls`
        : 'First innings in progress',
      rrr: chase ? chase.requiredRate.toFixed(2) : '—',
      crr: chase ? chase.currentRate.toFixed(2) : '—',
    },
    batters,
  } as unknown as HomeLiveMatch;
}
