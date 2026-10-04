import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Equivalent of Tailwind `animate-pulse` (opacity 1 → .5 → 1, 2 s). */
export function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  const o = useSharedValue(1);
  useEffect(() => {
    const ease = Easing.bezier(0.4, 0, 0.6, 1);
    o.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000, easing: ease }),
        withTiming(1, { duration: 1000, easing: ease }),
      ),
      -1,
      false,
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}
