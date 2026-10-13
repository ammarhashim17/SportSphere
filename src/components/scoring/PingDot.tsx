import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Tailwind `animate-ping`: scale 1→2 and fade 1→0, 1 s, cubic-bezier(0,0,.2,1), infinite. */
export function PingDot({ color, size = 8 }: { color: string; size?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.bezier(0, 0, 0.2, 1) }),
      -1,
      false,
    );
  }, [p]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value }],
    opacity: 1 - p.value,
  }));
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}
