import { View } from 'react-native';
import { Image } from 'expo-image';
import { initialsOf } from '@/core/identity';
import { RoleBadge, type PlayerRole } from './RoleBadge';
import { Text } from './Text';

type Props = {
  name: string;
  photoUrl?: string | null;
  role?: PlayerRole;
  size?: number;
};

export function PlayerAvatar({ name, photoUrl, role, size = 40 }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <View
          style={{ width: size, height: size, borderRadius: size / 2 }}
          className="items-center justify-center bg-surface-container"
        >
          <Text variant="caption" tone="muted" weight="semibold">
            {initialsOf(name)}
          </Text>
        </View>
      )}
      {role && (
        <View className="absolute -bottom-1 -right-1">
          <RoleBadge role={role} />
        </View>
      )}
    </View>
  );
}
