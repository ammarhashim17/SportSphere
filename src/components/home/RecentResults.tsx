import { View } from 'react-native';
import { Card, Icon, TeamCrest, Text } from '@/components/ui';
import { STITCH_HOME_FIXTURES } from '@/fixtures/stitchHome';
import { colors } from '@/theme/colors';

export function RecentResults() {
  const results = STITCH_HOME_FIXTURES.recentResults;

  return (
    <View className="w-full gap-2.5">
      <View className="flex-row items-center justify-between">
        <Text variant="title-sm">Recent Results</Text>
        <Text variant="caption" tone="primary" weight="semibold">
          Full archive
        </Text>
      </View>

      {results.map((res) => (
        <Card key={res.id} className="w-full gap-3 p-4 shadow-sm">
          {/* Winner Statement */}
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-1.5">
              <View
                style={{ backgroundColor: colors['primary-fixed'] }}
                className="h-5 w-5 items-center justify-center rounded-full"
              >
                <Icon name="check" size={14} color={colors['on-primary-fixed']} />
              </View>
              <Text variant="caption" tone="primary" weight="bold">
                {res.statement}
              </Text>
            </View>
            <Text variant="micro-label" tone="muted">
              {res.date}
            </Text>
          </View>

          {/* Scores Breakdown */}
          <View className="gap-2 rounded-lg bg-surface-container-low/50 p-2.5">
            {/* Team A */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <TeamCrest shortName={res.teamA.shortName} colour={res.teamA.colour} size="sm" />
                <Text variant="body-sm" weight="semibold">
                  {res.teamA.name}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text variant="title-sm">{res.teamA.score}</Text>
                <Text variant="caption" tone="muted">
                  {res.teamA.overs}
                </Text>
              </View>
            </View>

            {/* Team B */}
            <View className="flex-row items-center justify-between opacity-75">
              <View className="flex-row items-center gap-2">
                <TeamCrest shortName={res.teamB.shortName} colour={res.teamB.colour} size="sm" />
                <Text variant="body-sm" weight="medium">
                  {res.teamB.name}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text variant="body-md" weight="medium">
                  {res.teamB.score}
                </Text>
                <Text variant="caption" tone="muted">
                  {res.teamB.overs}
                </Text>
              </View>
            </View>
          </View>

          {/* Card Footer */}
          <View className="flex-row items-center justify-between pt-0.5">
            <Text variant="micro-label" tone="muted">
              Player of Match:{' '}
              <Text variant="micro-label" weight="bold">
                {res.potm}
              </Text>
            </Text>
            <View className="flex-row items-center gap-0.5">
              <Text variant="caption" tone="primary" weight="semibold">
                Scorecard
              </Text>
              <Icon name="chevron_right" size={16} color={colors.primary} />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}
