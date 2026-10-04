import { create } from 'zustand';

export type SyncStatusValue = 'synced' | 'syncing' | 'offline' | 'error';

type State = {
  status: SyncStatusValue;
  pending: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  patch: (p: Partial<Omit<State, 'patch'>>) => void;
};

export const useSyncStore = create<State>((set) => ({
  status: 'synced',
  pending: 0,
  lastSyncedAt: null,
  lastError: null,
  patch: (p) => set(p),
}));
