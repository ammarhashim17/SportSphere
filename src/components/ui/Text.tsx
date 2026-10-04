import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { cn } from '@/lib/cn';

export type TextVariant =
  | 'display-score'
  | 'headline-lg'
  | 'headline-md'
  | 'title-sm'
  | 'body-md'
  | 'body-sm'
  | 'caption'
  | 'micro-label';
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type TextTone = 'default' | 'muted' | 'primary' | 'inverse' | 'error' | 'amber' | 'none';

const SIZE: Record<TextVariant, string> = {
  'display-score': 'text-display-score',
  'headline-lg': 'text-headline-lg',
  'headline-md': 'text-headline-md',
  'title-sm': 'text-title-sm',
  'body-md': 'text-body-md',
  'body-sm': 'text-body-sm',
  caption: 'text-caption',
  'micro-label': 'text-micro-label',
};

const DEFAULT_WEIGHT: Record<TextVariant, TextWeight> = {
  'display-score': 'bold',
  'headline-lg': 'bold',
  'headline-md': 'semibold',
  'title-sm': 'semibold',
  'body-md': 'regular',
  'body-sm': 'regular',
  caption: 'medium',
  'micro-label': 'semibold',
};

const FAMILY: Record<TextWeight, string> = {
  regular: 'font-inter-regular',
  medium: 'font-inter-medium',
  semibold: 'font-inter-semibold',
  bold: 'font-inter-bold',
};

const TONE: Record<TextTone, string> = {
  default: 'text-on-surface',
  muted: 'text-on-surface-variant',
  primary: 'text-primary',
  inverse: 'text-on-primary',
  error: 'text-error',
  amber: 'text-[#B45309]',
  none: '',
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  weight?: TextWeight;
  tone?: TextTone;
  uppercase?: boolean;
  className?: string;
};

/** Always uses tabular numerals (DESIGN.md) so scores never shift layout. */
export function Text({
  variant = 'body-md',
  weight,
  tone = 'default',
  uppercase,
  className,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      className={cn(
        SIZE[variant],
        FAMILY[weight ?? DEFAULT_WEIGHT[variant]],
        TONE[tone],
        uppercase && 'uppercase',
        className,
      )}
      style={[{ fontVariant: ['tabular-nums'] }, style]}
    />
  );
}
