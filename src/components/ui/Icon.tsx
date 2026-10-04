import { createIconSet } from '@expo/vector-icons';
import glyphMap from '@/theme/iconGlyphs.json';

export type IconName = keyof typeof glyphMap;
const MaterialSymbol = createIconSet(
  glyphMap,
  'MaterialSymbolsOutlined',
  require('../../../assets/fonts/MaterialSymbolsOutlined.ttf'),
);

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
};

export function Icon({ name, size = 24, color = '#0b1c30' }: Props) {
  return <MaterialSymbol name={name} size={size} color={color} />;
}
