import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text } from '@/components/ui';
import { initialsOf } from '@/core/identity';
import { colors } from '@/theme/colors';
import { shadow } from '@/theme/shadows';
import { PingDot } from './PingDot';

/** Stitch `live_match_scoring` top bar (fixed header, h-16, 90 % white). The brand logo is `hidden sm:block` in Stitch → not shown on phones. */
export function LiveHeader({ userName, onProfile }: { userName?: string; onProfile?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[{ paddingTop: insets.top, backgroundColor: 'rgba(255,255,255,0.9)' }, shadow.header]}
    >
      <View className="h-16 flex-row items-center justify-between gap-space-sm px-margin">
        <View className="min-w-0 flex-row items-center gap-space-xs">
          <Pressable
            accessibilityLabel="Go Back"
            onPress={() => router.back()}
            className="-ml-1 min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
          >
            <Icon name="arrow_back_ios_new" size={24} color={colors['on-surface']} />
          </Pressable>
          <View className="min-w-0">
            <Text variant="title-sm" numberOfLines={1} className="leading-tight">
              Live Scoring
            </Text>
            <Text
              variant="micro-label"
              tone="muted"
              uppercase
              className="leading-none tracking-wider"
            >
              ScoreSphere
            </Text>
          </View>
        </View>
        <View className="shrink-0 flex-row items-center gap-space-sm">
          <View
            className="flex-row items-center gap-1.5 rounded-full bg-secondary-fixed/50 px-2.5 py-1"
            style={{ boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)' }}
          >
            <PingDot color={colors['secondary-container']} />
            <Text
              variant="micro-label"
              uppercase
              className="tracking-wide text-on-secondary-fixed"
              tone="none"
            >
              Live Match
            </Text>
          </View>
          <Pressable
            accessibilityLabel="User Profile"
            onPress={onProfile}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-1"
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-full bg-surface-container"
              style={{ boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)' }}
            >
              <Text variant="micro-label" tone="muted">
                {initialsOf(userName ?? '')}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
