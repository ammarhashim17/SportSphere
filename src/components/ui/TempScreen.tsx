// TEMP-UI: replace with Stitch design (LOCK-03)
import { ScrollView, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { Text } from './Text';
import { colors } from '@/theme/colors';

export function TempScreen({
  title,
  back,
  children,
}: {
  title: string;
  back?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <View className="h-16 flex-row items-center gap-2 px-margin">
        {back ? (
          <Pressable
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="arrow_back" size={24} color={colors['on-surface']} />
          </Pressable>
        ) : null}
        <Text variant="headline-md">{title}</Text>
      </View>
      <ScrollView
        contentContainerClassName="gap-space-md px-margin pb-24"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}
