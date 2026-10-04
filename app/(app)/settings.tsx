// TEMP-UI: replace with Stitch design (LOCK-03)
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, PlayerAvatar, RoleBadge, SyncPill, Text, TempScreen } from '@/components/ui';
import { useAuthStore } from '@/features/auth/authStore';
import { syncNow } from '@/sync/syncService';
import { useSyncStore } from '@/sync/syncStore';

export default function SettingsScreen() {
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const syncState = useSyncStore();
  const [signingOut, setSigningOut] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fullName = session?.user.user_metadata?.full_name || 'Coach Alex';
  const email = session?.user.email || 'scorer@scoresphere.app';

  const onManualSync = async () => {
    try {
      setSyncing(true);
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  const onSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local data will be wiped until your next sign in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut();
            } finally {
              setSigningOut(false);
            }
          },
        },
      ],
    );
  };

  return (
    <TempScreen title="Settings & Profile" back>
      {/* User Profile Card */}
      <Card className="items-center gap-3 p-5">
        <PlayerAvatar name={fullName} size={64} />
        <View className="items-center">
          <Text variant="headline-md">{fullName}</Text>
          <Text variant="body-sm" tone="muted">
            {email}
          </Text>
        </View>

        <View className="flex-row flex-wrap justify-center gap-2 pt-1">
          <RoleBadge role="AR" />
        </View>
      </Card>

      {/* Sync Status Card */}
      <Card className="gap-3 p-4">
        <Text variant="title-sm">Data Synchronization</Text>
        <View className="flex-row items-center justify-between border-b border-outline-variant pb-2">
          <Text variant="body-sm" tone="muted">
            Status
          </Text>
          <SyncPill status={syncState.status} />
        </View>

        <View className="flex-row items-center justify-between border-b border-outline-variant pb-2">
          <Text variant="body-sm" tone="muted">
            Pending Local Writes
          </Text>
          <Text variant="body-sm" weight="semibold">
            {syncState.pending}
          </Text>
        </View>

        <View className="flex-row items-center justify-between border-b border-outline-variant pb-2">
          <Text variant="body-sm" tone="muted">
            Last Synced
          </Text>
          <Text variant="body-sm" weight="semibold">
            {syncState.lastSyncedAt
              ? new Date(syncState.lastSyncedAt).toLocaleTimeString()
              : 'Never'}
          </Text>
        </View>

        {syncState.lastError ? (
          <Text variant="caption" tone="error">
            Error: {syncState.lastError}
          </Text>
        ) : null}

        <Button
          label={syncing ? 'Syncing...' : 'Sync Now'}
          variant="secondary"
          icon="sync"
          onPress={onManualSync}
          loading={syncing}
          full
          className="mt-1"
        />
      </Card>

      {/* App Information Card */}
      <Card className="gap-2.5 p-4">
        <Text variant="title-sm">App Information</Text>
        <View className="flex-row justify-between">
          <Text variant="body-sm" tone="muted">
            Version
          </Text>
          <Text variant="body-sm" weight="semibold">
            0.1.0 (Phase 1 Base)
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text variant="body-sm" tone="muted">
            Engine
          </Text>
          <Text variant="body-sm" weight="semibold">
            SQLite + Drizzle + Supabase
          </Text>
        </View>
      </Card>

      {/* Sign Out Card */}
      <Button
        label="Sign Out"
        variant="danger"
        icon="logout"
        onPress={onSignOut}
        loading={signingOut}
        full
        className="mt-2"
      />
    </TempScreen>
  );
}
