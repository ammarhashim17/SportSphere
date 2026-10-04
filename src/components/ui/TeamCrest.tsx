import { View } from 'react-native';
import { Image } from 'expo-image';
import { crestText, readableTextColor } from '@/core/identity';
import { Text } from './Text';

const SIZE = { sm: 32, md: 40, lg: 48, xl: 72 } as const;

type Props = {
  shortName?: string | null;
  name?: string;
  colour?: string | null;
  logoUrl?: string | null;
  size?: keyof typeof SIZE;
};

export function TeamCrest({ shortName, name, colour, logoUrl, size = 'md' }: Props) {
  const px = SIZE[size];
  const bg = colour ?? '#0D5C3A';
  if (logoUrl) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{ width: px, height: px, borderRadius: px / 2, backgroundColor: bg }}
      className="items-center justify-center"
    >
      <Text
        variant={px >= 48 ? 'title-sm' : 'micro-label'}
        weight="bold"
        tone="none"
        style={{ color: readableTextColor(bg) }}
      >
        {crestText(shortName, name)}
      </Text>
    </View>
  );
}
