import { View } from 'react-native';
import { colors } from '@/theme/colors';
import { PulseDot } from './PulseDot';
import { Text } from './Text';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
const DOT: Record<SyncStatus, string> = {
  synced: colors['primary-container'],
  syncing: colors['secondary-container'],
  offline: colors.outline,
  error: colors.error,
};
const LABEL: Record<SyncStatus, string> = {
  synced: 'Synced',
  syncing: 'Syncing',
  offline: 'Offline',
  error: 'Error',
};

export function SyncPill({ status, label }: { status: SyncStatus; label?: string }) {
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1"
      style={{ boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)' }}
    >
      <PulseDot color={DOT[status]} />
      <Text variant="micro-label" uppercase className="tracking-wide">
        {label ?? LABEL[status]}
      </Text>
    </View>
  );
}
