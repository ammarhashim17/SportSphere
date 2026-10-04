import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Gate() {
  return (
    <View className="flex-1 gap-4 bg-surface p-margin pt-16">
      <Text className="font-display-score text-display-score text-on-surface">102/3</Text>
      <Text className="font-title-sm text-title-sm text-primary">Title Sm 17 semibold</Text>
      <Text className="font-micro-label text-micro-label uppercase text-on-surface-variant">
        Micro Label
      </Text>
      <View className="rounded-2xl border border-[#E8EBEF] bg-white p-4 shadow-[0_2px_8px_rgba(16,24,40,0.06)]">
        <Text>Arbitrary shadow class</Text>
      </View>
      <View className="rounded-xl bg-white/90 p-4">
        <Text>White at 90% opacity</Text>
      </View>
      <View className="h-2 w-2 rounded-full bg-primary-container" />
      <LinearGradient
        colors={['#0D5C3A', '#1E8E5A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 80, borderRadius: 16 }}
      />
    </View>
  );
}
