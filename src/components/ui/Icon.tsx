import { createIconSet } from '@expo/vector-icons';
import glyphMap from '@/theme/iconGlyphs.json';

export type IconName = keyof typeof glyphMap;
const MaterialSymbol = createIconSet(
  glyphMap,
  'MaterialSymbolsOutlined',
  require('../../../assets/fonts/MaterialSymbolsOutlined.ttf'),
);
const MaterialSymbolFilled = createIconSet(
  glyphMap,
  'MaterialSymbolsFilled',
  require('../../../assets/fonts/MaterialSymbolsFilled.ttf'),
);

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, size = 24, color = '#0b1c30', filled = false }: Props) {
  const Glyph = filled ? MaterialSymbolFilled : MaterialSymbol;
  return <Glyph name={name} size={size} color={color} />;
}
