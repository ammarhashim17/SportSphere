// TEMP-UI: replace with Stitch design (LOCK-03)
import { TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '@/theme/colors';
import { Text } from './Text';

type Props = TextInputProps & { label: string; error?: string };

export function TextField({ label, error, ...rest }: Props) {
  return (
    <View className="gap-1">
      <Text variant="micro-label" tone="muted" uppercase>
        {label}
      </Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.outline}
        className="min-h-[48px] rounded-xl border border-outline-variant bg-surface-container-lowest px-4 font-inter-regular text-body-md text-on-surface"
      />
      {error ? (
        <Text variant="caption" tone="error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
