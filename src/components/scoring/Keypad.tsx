import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon, Text } from '@/components/ui';
import { colors } from '@/theme/colors';
import { shadow } from '@/theme/shadows';

export type KeypadAction =
  | { type: 'runs'; runs: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: 'wide' | 'noball'; long?: boolean }
  | { type: 'bye' | 'legbye' }
  | { type: 'wicket' | 'undo' | 'swap' | 'endover' };

type Props = { onAction: (a: KeypadAction) => void; disabled?: boolean };

const tap = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

function Key({
  className,
  style,
  onPress,
  onLongPress,
  label,
  children,
}: {
  className: string;
  style?: object;
  onPress: () => void;
  onLongPress?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      onLongPress={
        onLongPress
          ? () => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onLongPress();
            }
          : undefined
      }
      className={`items-center justify-center active:scale-[0.98] ${className}`}
      style={style}
    >
      {children}
    </Pressable>
  );
}

/** Stitch keypad console. Row heights: runs 56 (h-14), extras 48 (h-12), wicket 56. */
export function Keypad({ onAction, disabled }: Props) {
  const runs = (n: 0 | 1 | 2 | 3 | 4 | 5 | 6) => () => onAction({ type: 'runs', runs: n });
  const plain = 'h-14 flex-1 rounded-xl bg-surface-container-lowest';
  return (
    <View
      className={`gap-2 pb-4 pt-1 ${disabled ? 'opacity-50' : ''}`}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <View className="flex-row gap-2">
        <Key label="Dot ball" onPress={runs(0)} className={plain} style={shadow.key}>
          <Text variant="title-sm" weight="bold" className="leading-none">
            0
          </Text>
          <Text variant="micro-label" tone="muted" weight="medium">
            Dot
          </Text>
        </Key>
        {([1, 2, 3] as const).map((n) => (
          <Key
            key={n}
            label={`${n} run${n > 1 ? 's' : ''}`}
            onPress={runs(n)}
            className={plain}
            style={shadow.key}
          >
            <Text variant="headline-md" weight="bold">
              {n}
            </Text>
          </Key>
        ))}
      </View>

      <View className="flex-row gap-2">
        <Key
          label="Four, boundary"
          onPress={runs(4)}
          className="h-14 flex-1 rounded-xl bg-primary"
          style={shadow.sm}
        >
          <Text variant="headline-md" weight="bold" tone="inverse" className="leading-none">
            4
          </Text>
          <Text
            variant="micro-label"
            tone="none"
            uppercase
            className="leading-tight tracking-widest text-primary-fixed"
          >
            Boundary
          </Text>
        </Key>
        <Key
          label="Six, maximum"
          onPress={runs(6)}
          className="h-14 flex-1 rounded-xl bg-tertiary"
          style={shadow.sm}
        >
          <Text
            variant="headline-md"
            weight="bold"
            tone="none"
            className="leading-none text-on-tertiary"
          >
            6
          </Text>
          <Text
            variant="micro-label"
            tone="none"
            uppercase
            className="leading-tight tracking-widest text-tertiary-fixed"
          >
            Maximum
          </Text>
        </Key>
        <Key label="Five runs" onPress={runs(5)} className={plain} style={shadow.key}>
          <Text variant="headline-md" weight="bold">
            5
          </Text>
        </Key>
      </View>

      <View className="flex-row gap-2">
        {[
          {
            a: { type: 'wide' } as KeypadAction,
            long: { type: 'wide', long: true } as KeypadAction,
            t: 'Wd +1',
            s: 'Wide',
          },
          {
            a: { type: 'noball' } as KeypadAction,
            long: { type: 'noball', long: true } as KeypadAction,
            t: 'Nb +1',
            s: 'No Ball',
          },
          { a: { type: 'bye' } as KeypadAction, long: undefined, t: 'Bye', s: 'Extra' },
          { a: { type: 'legbye' } as KeypadAction, long: undefined, t: 'Leg Bye', s: 'Extra' },
        ].map((k) => (
          <Key
            key={k.t}
            label={k.s === 'Extra' ? k.t : `${k.s}, long press for more runs`}
            onPress={() => onAction(k.a)}
            onLongPress={k.long ? () => onAction(k.long!) : undefined}
            className="h-12 flex-1 rounded-xl bg-secondary-fixed"
            style={shadow.keyExtra}
          >
            <Text
              variant="caption"
              weight="bold"
              tone="none"
              className="leading-tight text-on-secondary-fixed"
            >
              {k.t}
            </Text>
            <Text
              variant="micro-label"
              tone="none"
              uppercase
              className="tracking-wider text-on-secondary-fixed-variant"
              style={{ fontSize: 9 }}
            >
              {k.s}
            </Text>
          </Key>
        ))}
      </View>

      <Key
        label="Out, wicket"
        onPress={() => onAction({ type: 'wicket' })}
        className="h-14 w-full flex-row gap-2 rounded-xl bg-error"
        style={shadow.md}
      >
        <Icon name="sports_score" size={24} color={colors['on-error']} />
        <Text
          variant="title-sm"
          weight="bold"
          tone="none"
          uppercase
          className="tracking-wide text-on-error"
        >
          Out / Wicket
        </Text>
      </Key>

      <View className="mt-1 flex-row gap-2">
        <Key
          label="Undo last ball"
          onPress={() => onAction({ type: 'undo' })}
          className="h-12 flex-1 flex-row gap-1 rounded-xl bg-surface-container"
          style={shadow.sm}
        >
          <Icon name="undo" size={18} color={colors['on-surface']} />
          <Text variant="caption" weight="semibold">
            Undo
          </Text>
        </Key>
        <Key
          label="Swap strike"
          onPress={() => onAction({ type: 'swap' })}
          className="h-12 flex-1 flex-row gap-1 rounded-xl bg-surface-container"
          style={shadow.sm}
        >
          <Icon name="swap_horiz" size={18} color={colors['on-surface']} />
          <Text variant="caption" weight="semibold">
            Swap Strike
          </Text>
        </Key>
        <Key
          label="End over, change bowler"
          onPress={() => onAction({ type: 'endover' })}
          className="h-12 flex-1 flex-row gap-1 rounded-xl bg-primary"
          style={shadow.sm}
        >
          <Text variant="caption" weight="bold" tone="inverse">
            End Over
          </Text>
          <Icon name="chevron_right" size={18} color={colors['on-primary']} />
        </Key>
      </View>
    </View>
  );
}
