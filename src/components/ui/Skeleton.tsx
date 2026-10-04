import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}) {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: '#E5EEFF',
        },
        style,
      ]}
    />
  );
}
