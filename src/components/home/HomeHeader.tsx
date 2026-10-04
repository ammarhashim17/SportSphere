import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayerAvatar, SyncPill, Text } from '@/components/ui';
import { useAuthStore } from '@/features/auth/authStore';
import { STITCH_HOME_FIXTURES } from '@/fixtures/stitchHome';
import { shadow } from '@/theme/shadows';

export function HomeHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const fullName = session?.user.user_metadata?.full_name || STITCH_HOME_FIXTURES.user.name;

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
          backgroundColor: 'rgba(255,255,255,0.92)',
        },
        shadow.navTop,
      ]}
      className="z-50 w-full"
    >
      <View className="h-16 flex-row items-center justify-between px-margin">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Text variant="title-sm" tone="inverse" weight="bold">
              SS
            </Text>
          </View>
          <View>
            <Text variant="title-sm" weight="bold">
              ScoreSphere
            </Text>
            <Text variant="micro-label" tone="muted" uppercase>
              Home
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-3">
          <SyncPill status="synced" />
          <Pressable
            accessibilityLabel="User Profile and Settings"
            onPress={() => router.push('/settings' as never)}
            className="rounded-full active:opacity-75"
          >
            <PlayerAvatar
              name={fullName}
              photoUrl={STITCH_HOME_FIXTURES.user.avatarUrl}
              size={36}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
