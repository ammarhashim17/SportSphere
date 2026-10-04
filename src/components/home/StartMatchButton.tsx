import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Icon, Text } from '@/components/ui';
import { colors } from '@/theme/colors';

export function StartMatchButton() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/(app)/(tabs)/matches' as never)}
      className="w-full active:opacity-95"
    >
      <LinearGradient
        colors={[colors.primary, colors['primary-container']]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="h-[52px] flex-row items-center justify-between rounded-xl px-4 shadow-md"
      >
        <View className="flex-row items-center gap-3">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <Icon name="add" size={20} color={colors['on-primary']} />
          </View>
          <Text variant="title-sm" tone="inverse">
            Start New Match
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Text variant="caption" weight="medium" style={{ color: colors['primary-fixed'] }}>
            Setup
          </Text>
          <Icon name="arrow_forward" size={18} color={colors['primary-fixed']} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
