import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text, type IconName } from '@/components/ui';
import { colors } from '@/theme/colors';
import { shadow } from '@/theme/shadows';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'sports_cricket' },
  matches: { label: 'Matches', icon: 'scoreboard' },
  teams: { label: 'Teams', icon: 'shield' },
  stats: { label: 'Stats', icon: 'bar_chart' },
};

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { paddingBottom: insets.bottom, backgroundColor: 'rgba(255,255,255,0.95)' },
        shadow.navTop,
      ]}
    >
      <View className="h-16 flex-row items-center justify-around px-space-xs">
        {state.routes.map((route, index) => {
          const cfg = TABS[route.name];
          if (!cfg) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={cfg.label}
              onPress={() => {
                if (!focused) navigation.navigate(route.name);
              }}
              className="min-h-[48px] min-w-[48px] items-center justify-center gap-0.5 rounded-lg px-3 py-1"
            >
              <Icon
                name={cfg.icon}
                size={24}
                color={focused ? colors.primary : colors['on-surface-variant']}
              />
              <Text
                variant="caption"
                weight={focused ? 'semibold' : 'medium'}
                tone={focused ? 'primary' : 'muted'}
                className="text-center leading-tight"
              >
                {cfg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
