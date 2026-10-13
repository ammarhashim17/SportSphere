import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui';
import type { BallView } from '@/core/scoring';
import { shadow } from '@/theme/shadows';

/** Stitch "Current Over" card with colour-coded delivery bubbles. */
export function OverStrip({
  overNumber,
  runs,
  balls,
}: {
  overNumber: number;
  runs: number;
  balls: BallView[];
}) {
  return (
    <View
      className="flex-row items-center justify-between rounded-xl bg-surface-container-lowest px-3.5 py-3"
      style={shadow.l1}
    >
      <View className="shrink-0">
        <Text variant="micro-label" tone="muted" uppercase className="tracking-wider">
          Over {overNumber}
        </Text>
        <Text variant="caption" weight="bold">
          {runs} {runs === 1 ? 'Run' : 'Runs'}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-center gap-1.5 py-1"
        className="ml-3 flex-1"
        style={{ flexGrow: 1 }}
      >
        {balls.map((b) => (
          <Bubble key={b.deliveryId} ball={b} />
        ))}
      </ScrollView>
    </View>
  );
}

export function Bubble({ ball }: { ball: BallView }) {
  switch (ball.kind) {
    case 'dot':
      return (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-surface-container">
          <View className="h-1.5 w-1.5 rounded-full bg-on-surface-variant" />
        </View>
      );
    case 'run':
      return (
        <View
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-container-lowest"
          style={shadow.bubble}
        >
          <Text variant="caption" weight="bold">
            {ball.label}
          </Text>
        </View>
      );
    case 'four':
    case 'six': {
      const four = ball.kind === 'four';
      return (
        <View
          className={`h-8 flex-row items-center justify-center gap-0.5 rounded-full px-2 ${four ? 'bg-primary-container' : 'bg-tertiary'}`}
          style={shadow.sm}
        >
          <Text variant="caption" weight="bold" tone="inverse">
            {ball.label}
          </Text>
          <Text
            variant="micro-label"
            tone="inverse"
            uppercase
            className="opacity-80"
            style={{ fontSize: 9 }}
          >
            {four ? '4s' : '6s'}
          </Text>
        </View>
      );
    }
    case 'wicket':
      return (
        <View
          className="h-8 w-8 items-center justify-center rounded-full bg-error"
          style={shadow.sm}
        >
          <Text variant="caption" weight="bold" tone="none" className="text-on-error">
            W
          </Text>
        </View>
      );
    case 'extra':
      return (
        <View
          className="h-8 items-center justify-center rounded-full bg-secondary-fixed px-2"
          style={shadow.sm}
        >
          <Text variant="caption" weight="semibold" tone="none" className="text-on-secondary-fixed">
            {ball.label}
          </Text>
        </View>
      );
  }
}
