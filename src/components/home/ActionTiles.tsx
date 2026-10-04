import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Icon, Text } from '@/components/ui';
import { STITCH_HOME_FIXTURES } from '@/fixtures/stitchHome';
import { colors } from '@/theme/colors';

export function ActionTiles() {
  const router = useRouter();
  const tiles = STITCH_HOME_FIXTURES.quickTiles;

  return (
    <View className="w-full flex-row gap-3">
      {tiles.map((tile) => (
        <Pressable
          key={tile.title}
          onPress={() => router.push(tile.route as never)}
          className="flex-1 active:opacity-90"
        >
          <Card className="justify-between gap-3 p-3.5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View
                style={{ backgroundColor: colors['surface-container'] }}
                className="h-10 w-10 items-center justify-center rounded-lg"
              >
                <Icon name={tile.icon} size={22} color={tile.color} />
              </View>
              <Icon name="arrow_forward" size={18} color={colors['on-surface-variant']} />
            </View>

            <View>
              <Text variant="title-sm">{tile.title}</Text>
              <Text variant="caption" tone="muted" className="mt-0.5">
                {tile.subtitle}
              </Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
