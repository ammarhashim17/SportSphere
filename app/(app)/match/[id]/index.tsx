// TEMP-UI: replace with Stitch design (LOCK-03) — match hub (setup / innings break / result). Full scorecard is Phase 3.
import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Chip } from '@/components/scoring/sheets';
import { Button, StatusPill, TempScreen, Text } from '@/components/ui';
import { shortName } from '@/core/identity';
import { formatOvers } from '@/core/scoring';
import { useAuthStore } from '@/features/auth/authStore';
import { startSecondInnings } from '@/features/matches/matchRepository';
import { undoLastDelivery } from '@/features/scoring/deliveryRepository';
import { useLiveScoring } from '@/features/scoring/useLiveScoring';

export default function MatchHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id ?? '');
  const live = useLiveScoring(id);
  const [striker, setStriker] = useState('');
  const [non, setNon] = useState('');
  const [bowler, setBowler] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!live.ready)
    return (
      <TempScreen title="Match" back>
        <Text>Loading…</Text>
      </TempScreen>
    );
  const { match, current, state, cfg, firstState } = live;

  if (match.status === 'live' && current && state?.status === 'in_progress')
    return <Redirect href={`/match/${id}/score` as never} />;

  const title = `${live.teamName(match.teamAId)} vs ${live.teamName(match.teamBId)}`;
  const line = (s: typeof state, teamId: string) =>
    s
      ? `${live.teamName(teamId)} ${s.runs}/${s.wickets} (${formatOvers(s.legalBalls, cfg.ballsPerOver)} ov)`
      : '';

  // innings break → choose the openers of the chase
  const secondBat = firstState ? live.teamName(live.inningsRows[0]!.bowlingTeamId) : '';
  const batXi = live.inningsRows[0]
    ? live.xi
        .filter((x) => x.active && x.teamId === live.inningsRows[0]!.bowlingTeamId)
        .sort((a, b) => a.battingOrder - b.battingOrder)
    : [];
  const bowlXi = live.inningsRows[0]
    ? live.xi
        .filter((x) => x.active && x.teamId === live.inningsRows[0]!.battingTeamId)
        .sort((a, b) => a.battingOrder - b.battingOrder)
    : [];

  return (
    <TempScreen title="Match" back>
      <Text variant="headline-md">{title}</Text>
      <View className="flex-row">
        <StatusPill
          status={
            match.status === 'completed'
              ? 'completed'
              : match.status === 'upcoming'
                ? 'upcoming'
                : 'live'
          }
        />
      </View>

      {match.status === 'upcoming' && (
        <>
          <Text variant="body-md" tone="muted">
            Finish the setup (XI, toss, openers) to start scoring.
          </Text>
          <Button
            label="Continue setup"
            onPress={() => router.push(`/match/new?matchId=${id}` as never)}
          />
        </>
      )}

      {match.status === 'innings_break' && firstState && (
        <>
          <Text variant="title-sm">Innings break</Text>
          <Text variant="body-md">{line(firstState, live.inningsRows[0]!.battingTeamId)}</Text>
          <Text variant="body-md" tone="muted">
            {secondBat} need {firstState.runs + 1} to win.
          </Text>
          <Text variant="micro-label" tone="muted" uppercase>
            Opening batter 1 (on strike)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {batXi.map((x) => (
              <Chip
                key={x.playerId}
                label={shortName(live.playerName(x.playerId))}
                selected={striker === x.playerId}
                disabled={non === x.playerId}
                onPress={() => setStriker(x.playerId)}
              />
            ))}
          </View>
          <Text variant="micro-label" tone="muted" uppercase>
            Opening batter 2
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {batXi.map((x) => (
              <Chip
                key={x.playerId}
                label={shortName(live.playerName(x.playerId))}
                selected={non === x.playerId}
                disabled={striker === x.playerId}
                onPress={() => setNon(x.playerId)}
              />
            ))}
          </View>
          <Text variant="micro-label" tone="muted" uppercase>
            Opening bowler
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {bowlXi.map((x) => (
              <Chip
                key={x.playerId}
                label={shortName(live.playerName(x.playerId))}
                selected={bowler === x.playerId}
                onPress={() => setBowler(x.playerId)}
              />
            ))}
          </View>
          {error ? (
            <Text variant="body-sm" tone="error">
              {error}
            </Text>
          ) : null}
          <Button
            label="Start second innings"
            disabled={!striker || !non || !bowler}
            onPress={() =>
              startSecondInnings(
                id,
                { strikerId: striker, nonStrikerId: non, bowlerId: bowler },
                userId,
              )
                .then(() => router.replace(`/match/${id}/score` as never))
                .catch((e: Error) => setError(e.message))
            }
          />
        </>
      )}

      {match.status === 'completed' && (
        <>
          <Text variant="title-sm">{match.resultSummary ?? 'Match complete'}</Text>
          {firstState ? (
            <Text variant="body-md">{line(firstState, live.inningsRows[0]!.battingTeamId)}</Text>
          ) : null}
          {live.inningsRows[1] && state ? (
            <Text variant="body-md">{line(state, live.inningsRows[1].battingTeamId)}</Text>
          ) : null}
          <Text variant="body-sm" tone="muted">
            The full scorecard arrives in Phase 3.
          </Text>
          {current ? (
            <Button
              label="Undo last ball (correct a mistake)"
              variant="secondary"
              onPress={() =>
                undoLastDelivery(current.id, userId).catch((e: Error) => setError(e.message))
              }
            />
          ) : null}
          {error ? (
            <Text variant="body-sm" tone="error">
              {error}
            </Text>
          ) : null}
        </>
      )}
    </TempScreen>
  );
}
