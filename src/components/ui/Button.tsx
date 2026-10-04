import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  full?: boolean;
  className?: string;
};

const WRAP: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface-container-low',
  danger: 'bg-error',
  ghost: 'bg-transparent',
};

const TEXT_TONE = {
  primary: 'inverse',
  secondary: 'primary',
  danger: 'inverse',
  ghost: 'primary',
} as const;

const ICON_COLOR: Record<Variant, string> = {
  primary: colors['on-primary'],
  secondary: colors.primary,
  danger: colors['on-error'],
  ghost: colors.primary,
};

export function Button({
  label,
  variant = 'primary',
  icon,
  loading,
  full,
  disabled,
  className,
  ...rest
}: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      {...rest}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      className={cn(
        'min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl px-5',
        WRAP[variant],
        full && 'w-full',
        off && 'opacity-50',
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={ICON_COLOR[variant]} />
      ) : icon ? (
        <Icon name={icon} size={20} color={ICON_COLOR[variant]} />
      ) : (
        <View />
      )}
      <Text variant="title-sm" tone={TEXT_TONE[variant]}>
        {label}
      </Text>
    </Pressable>
  );
}
