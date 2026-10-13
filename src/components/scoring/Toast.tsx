import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui';
import { shadow } from '@/theme/shadows';

/** Stitch feedback pill: bg-inverse-surface text-inverse-on-surface, 1.2 s, fades out. `trigger` changes → show again. */
export function Toast({ message, trigger }: { message: string; trigger: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    if (trigger === 0) return;
    o.value = withSequence(
      withTiming(1, { duration: 150 }),
      withDelay(1200, withTiming(0, { duration: 300 })),
    );
  }, [trigger, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute bottom-24 self-center rounded-full bg-inverse-surface px-4 py-2"
      style={[style, shadow.xl]}
    >
      <Text variant="caption" weight="semibold" tone="none" className="text-inverse-on-surface">
        {message}
      </Text>
    </Animated.View>
  );
}
