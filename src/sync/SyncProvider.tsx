import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { eq } from 'drizzle-orm';
import { clearLocalData, db } from '@/db/client';
import { syncState } from '@/db/schema';
import { useAuthStore } from '@/features/auth/authStore';
import { refreshPending, syncNow } from './syncService';
import { useSyncStore } from './syncStore';

/** If the local database belongs to another account, wipe it before syncing (SEC-11). */
async function ensureOwner(userId: string): Promise<void> {
  const [row] = await db.select().from(syncState).where(eq(syncState.key, 'owner'));
  if (row && row.value !== userId) await clearLocalData();
  await db
    .insert(syncState)
    .values({ key: 'owner', value: userId })
    .onConflictDoUpdate({ target: syncState.key, set: { value: userId } });
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore((s) => s.session?.user.id);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      await ensureOwner(userId);
      await refreshPending();
      if (!cancelled) void syncNow();
    })();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncNow();
    });
    const netUnsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) void syncNow();
      else useSyncStore.getState().patch({ status: 'offline' });
    });
    return () => {
      cancelled = true;
      appSub.remove();
      netUnsub();
    };
  }, [userId]);

  return <>{children}</>;
}
