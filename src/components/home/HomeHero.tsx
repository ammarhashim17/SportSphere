import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, PulseDot, Text } from '@/components/ui';
import { useAuthStore } from '@/features/auth/authStore';
import { STITCH_HOME_FIXTURES } from '@/fixtures/stitchHome';
import { colors } from '@/theme/colors';

export function HomeHero() {
  const session = useAuthStore((s) => s.session);
  const fullName = session?.user.user_metadata?.full_name || STITCH_HOME_FIXTURES.user.name;

  return (
    <LinearGradient
      colors={[colors['primary-container'], colors.primary, colors['primary-container']]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="w-full px-margin pb-14 pt-4 shadow-sm"
    >
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
            <PulseDot color={colors['primary-fixed']} size={8} />
            <Text variant="micro-label" style={{ color: colors['primary-fixed'] }} uppercase>
              {STITCH_HOME_FIXTURES.user.syncText}
            </Text>
          </View>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <Icon name="notifications" size={18} color={colors['on-primary']} />
          </View>
        </View>

        <View className="mt-1">
          <Text variant="headline-lg" tone="inverse">
            Welcome back, {fullName}
          </Text>
          <Text
            variant="body-sm"
            style={{ color: colors['primary-fixed'], opacity: 0.9 }}
            className="mt-0.5"
          >
            {STITCH_HOME_FIXTURES.user.subtitle}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
