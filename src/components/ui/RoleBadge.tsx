import { View } from 'react-native';
import { Text } from './Text';

export type PlayerRole = 'BAT' | 'BOWL' | 'AR' | 'WK';

export function RoleBadge({ role }: { role: PlayerRole }) {
  return (
    <View className="h-4 items-center justify-center rounded-full bg-brand-ink px-1.5">
      <Text variant="micro-label" tone="inverse" style={{ fontSize: 9, lineHeight: 12 }}>
        {role}
      </Text>
    </View>
  );
}
