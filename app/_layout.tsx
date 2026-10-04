import '../global.css';
import 'react-native-url-polyfill/auto';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import migrations from '../drizzle/migrations';
import { useAuthStore } from '@/features/auth/authStore';
import { SyncProvider } from '@/sync/SyncProvider';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    MaterialSymbolsOutlined: require('../assets/fonts/MaterialSymbolsOutlined.ttf'),
  });
  const { success: dbReady, error: dbError } = useMigrations(db, migrations);
  const init = useAuthStore((s) => s.init);
  const initialized = useAuthStore((s) => s.initialized);
  const session = useAuthStore((s) => s.session);

  useEffect(() => init(), [init]);

  const ready = fontsLoaded && dbReady && initialized;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (dbError) throw dbError;
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <SyncProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!!session}>
                <Stack.Screen name="(app)" />
              </Stack.Protected>
              <Stack.Protected guard={!session}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
            </Stack>
          </SyncProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
