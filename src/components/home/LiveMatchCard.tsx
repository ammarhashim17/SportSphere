import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Icon, StatusPill, TeamCrest, Text } from '@/components/ui';
import { STITCH_HOME_FIXTURES } from '@/fixtures/stitchHome';
import { colors } from '@/theme/colors';

export function LiveMatchCard() {
  const router = useRouter();
  const match = STITCH_HOME_FIXTURES.liveMatch;
  const batter1 = match.batters[0] ?? { name: 'R. Sharma', runs: '42*', balls: '29' };
  const batter2 = match.batters[1] ?? { name: 'M. Ali', runs: '18', balls: '12' };

  return (
    <Card className="w-full gap-3.5 p-4 shadow-sm">
      {/* Tournament Meta & Live Status */}
      <View className="flex-row items-center justify-between gap-2 pb-1">
        <View className="flex-1 flex-row items-center gap-1.5">
          <Icon name="stadium" size={16} color={colors.primary} />
          <Text variant="caption" tone="muted" className="truncate font-medium">
            {match.tournament}
          </Text>
        </View>
        <StatusPill status="live" />
      </View>

      {/* Teams & Tabular Scores */}
      <View className="gap-3 rounded-lg bg-surface-container-low/60 p-3">
        {/* Team 1 (Chasing) */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <TeamCrest shortName={match.team1.shortName} colour={match.team1.colour} size="sm" />
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text variant="title-sm">{match.team1.name}</Text>
                <View className="rounded bg-primary/10 px-1.5 py-0.5">
                  <Text variant="micro-label" tone="primary" uppercase>
                    Bat
                  </Text>
                </View>
              </View>
              <Text variant="caption" tone="muted">
                {match.team1.target}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text variant="headline-lg" className="leading-none tracking-tight">
              {match.team1.score}
            </Text>
            <Text variant="caption" tone="muted" className="mt-0.5">
              {match.team1.overs}
            </Text>
          </View>
        </View>

        <View className="h-px w-full bg-surface-container" />

        {/* Team 2 (Defending) */}
        <View className="flex-row items-center justify-between opacity-80">
          <View className="flex-row items-center gap-2.5">
            <TeamCrest shortName={match.team2.shortName} colour={match.team2.colour} size="sm" />
            <View>
              <Text variant="body-md" weight="semibold">
                {match.team2.name}
              </Text>
              <Text variant="caption" tone="muted">
                {match.team2.subtext}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text variant="title-sm">{match.team2.score}</Text>
            <Text variant="caption" tone="muted">
              {match.team2.overs}
            </Text>
          </View>
        </View>
      </View>

      {/* Situation Strip */}
      <View className="flex-row items-center justify-between rounded-lg bg-surface-container-high/70 px-3 py-2">
        <Text variant="caption" weight="semibold" className="truncate">
          {match.situation.runsNeeded}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text variant="caption" tone="muted">
            RRR{' '}
            <Text variant="caption" weight="semibold">
              {match.situation.rrr}
            </Text>
          </Text>
          <Text variant="caption" tone="muted">
            •
          </Text>
          <Text variant="caption" tone="muted">
            CRR{' '}
            <Text variant="caption" weight="semibold">
              {match.situation.crr}
            </Text>
          </Text>
        </View>
      </View>

      {/* Batters at Crease */}
      <View className="flex-row items-center justify-between pt-0.5">
        <View className="flex-row items-center gap-2">
          <Icon name="sports_cricket" size={16} color={colors.primary} />
          <View className="flex-row items-baseline gap-1">
            <Text variant="caption" weight="semibold">
              {batter1.name}
            </Text>
            <Text variant="caption" tone="primary" weight="bold">
              {batter1.runs}
            </Text>
            <Text variant="caption" tone="muted">
              ({batter1.balls})
            </Text>
          </View>
        </View>

        <View className="flex-row items-baseline gap-1">
          <Text variant="caption" weight="medium">
            {batter2.name}
          </Text>
          <Text variant="caption" weight="semibold">
            {batter2.runs}
          </Text>
          <Text variant="caption" tone="muted">
            ({batter2.balls})
          </Text>
        </View>
      </View>

      {/* Resume Scoring Console Button */}
      <Button
        label="Resume Scoring Console"
        icon="edit_note"
        onPress={() => router.push('/(app)/(tabs)/matches' as never)}
        full
      />
    </Card>
  );
}
