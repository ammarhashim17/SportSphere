import { ScrollView, View } from 'react-native';
import { Card, Icon, TeamCrest, Text } from '@/components/ui';
import { STITCH_HOME_FIXTURES } from '@/fixtures/stitchHome';
import { colors } from '@/theme/colors';

export function UpcomingCarousel() {
  const matches = STITCH_HOME_FIXTURES.upcoming;

  return (
    <View className="w-full gap-2.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Text variant="title-sm">Upcoming Matches</Text>
          <View className="rounded-full bg-surface-container px-2 py-0.5">
            <Text variant="micro-label" tone="muted" weight="bold">
              {matches.length}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-0.5">
          <Text variant="caption" tone="primary" weight="semibold">
            View all
          </Text>
          <Icon name="chevron_right" size={16} color={colors.primary} />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 pr-margin"
      >
        {matches.map((item) => (
          <Card key={item.id} className="w-[260px] justify-between gap-3 p-3.5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Icon name="event" size={15} color={colors.secondary} />
                <Text variant="caption" weight="semibold" style={{ color: colors.secondary }}>
                  {item.date}
                </Text>
              </View>
              <View className="rounded bg-surface-container px-1.5 py-0.5">
                <Text variant="micro-label" tone="muted" uppercase>
                  {item.format}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between py-1">
              <View className="w-20 items-center gap-1 text-center">
                <TeamCrest shortName={item.teamA.shortName} colour={item.teamA.colour} size="md" />
                <Text variant="caption" weight="medium" className="truncate">
                  {item.teamA.name}
                </Text>
              </View>

              <Text variant="caption" tone="muted" weight="bold">
                VS
              </Text>

              <View className="w-20 items-center gap-1 text-center">
                <TeamCrest shortName={item.teamB.shortName} colour={item.teamB.colour} size="md" />
                <Text variant="caption" weight="medium" className="truncate">
                  {item.teamB.name}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center justify-between pt-1">
              <View className="flex-row items-center gap-1">
                <Icon name="location_on" size={14} color={colors['on-surface-variant']} />
                <Text variant="micro-label" tone="muted">
                  {item.venue}
                </Text>
              </View>
              <View className="rounded-md bg-surface-container px-2.5 py-1">
                <Text variant="caption" weight="medium">
                  Details
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
