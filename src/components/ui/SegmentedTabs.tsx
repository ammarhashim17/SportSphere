import { Pressable, View } from 'react-native';
import { shadow } from '@/theme/shadows';
import { Text } from './Text';

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
};

export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View className="flex-row rounded-xl bg-surface-container-low p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`min-h-[40px] flex-1 items-center justify-center rounded-lg ${
              active ? 'bg-surface-container-lowest' : ''
            }`}
            style={active ? shadow.l1 : undefined}
          >
            <Text
              variant="body-sm"
              weight={active ? 'semibold' : 'medium'}
              tone={active ? 'primary' : 'muted'}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
