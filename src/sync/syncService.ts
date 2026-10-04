/* eslint-disable @typescript-eslint/no-explicit-any */
import NetInfo from '@react-native-community/netinfo';
import { asc, count, eq } from 'drizzle-orm';
import { fromServer } from '@/core/caseMap';
import { db } from '@/db/client';
import { players, profile, syncOutbox, syncState, teamPlayers, teams } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import { useSyncStore } from './syncStore';

type Entity = 'teams' | 'players' | 'team_players';
const ENTITIES: Entity[] = ['teams', 'players', 'team_players'];
const EPOCH = '1970-01-01T00:00:00.000Z';
const PAGE = 500;

const upsertLocal = async (entity: Entity, row: any): Promise<void> => {
  if (entity === 'teams') {
    await db.insert(teams).values(row).onConflictDoUpdate({ target: teams.id, set: row });
  } else if (entity === 'players') {
    await db.insert(players).values(row).onConflictDoUpdate({ target: players.id, set: row });
  } else {
    await db
      .insert(teamPlayers)
      .values(row)
      .onConflictDoUpdate({ target: [teamPlayers.teamId, teamPlayers.playerId], set: row });
  }
};

const keyOf = (entity: Entity, row: any): string =>
  entity === 'team_players' ? `${row.teamId}:${row.playerId}` : row.id;

const conflictTarget = (entity: Entity) => (entity === 'team_players' ? 'team_id,player_id' : 'id');

let running = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Debounced request, called after every local write. */
export function requestSync(delayMs = 1500): void {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delayMs);
}

export async function refreshPending(): Promise<void> {
  const [row] = await db.select({ n: count() }).from(syncOutbox);
  useSyncStore.getState().patch({ pending: row?.n ?? 0 });
}

export async function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return;
  }
  running = true;
  const patch = useSyncStore.getState().patch;
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected || net.isInternetReachable === false) {
      patch({ status: 'offline' });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;

    patch({ status: 'syncing', lastError: null });
    await push();
    await pull(userId);
    patch({ status: 'synced', lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    patch({ status: 'error', lastError: e instanceof Error ? e.message : String(e) });
  } finally {
    running = false;
    await refreshPending();
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

async function push(): Promise<void> {
  for (;;) {
    const batch = await db.select().from(syncOutbox).orderBy(asc(syncOutbox.createdAt)).limit(50);
    if (batch.length === 0) return;
    for (const item of batch) {
      const entity = item.entity as Entity;
      const { error } = await (supabase as any)
        .from(entity)
        .upsert(JSON.parse(item.payload), { onConflict: conflictTarget(entity) });
      if (error) {
        await db
          .update(syncOutbox)
          .set({ attempts: item.attempts + 1, lastError: error.message })
          .where(eq(syncOutbox.id, item.id));
        throw new Error(`${entity}: ${error.message}`);
      }
      await db.delete(syncOutbox).where(eq(syncOutbox.id, item.id));
    }
  }
}

async function getCursor(entity: Entity): Promise<string> {
  const [row] = await db
    .select()
    .from(syncState)
    .where(eq(syncState.key, `cursor:${entity}`));
  return row?.value ?? EPOCH;
}

const setCursor = (entity: Entity, value: string) =>
  db
    .insert(syncState)
    .values({ key: `cursor:${entity}`, value })
    .onConflictDoUpdate({ target: syncState.key, set: { value } });

async function pending(entity: Entity): Promise<Set<string>> {
  const rows = await db
    .select({ k: syncOutbox.entityKey })
    .from(syncOutbox)
    .where(eq(syncOutbox.entity, entity));
  return new Set(rows.map((r) => r.k));
}

async function pull(userId: string): Promise<void> {
  const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (p) {
    const row = {
      id: p.id,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      phone: p.phone,
      roles: p.roles,
      updatedAt: p.updated_at,
    };
    await db.insert(profile).values(row).onConflictDoUpdate({ target: profile.id, set: row });
  }
  for (const entity of ENTITIES) {
    let cursor = await getCursor(entity);
    for (;;) {
      const { data, error } = await (supabase as any)
        .from(entity)
        .select('*')
        .gt('updated_at', cursor)
        .order('updated_at', { ascending: true })
        .limit(PAGE);
      if (error) throw new Error(`${entity}: ${error.message}`);
      if (!data || data.length === 0) break;
      const skip = await pending(entity);
      for (const raw of data) {
        const row = fromServer(raw);
        if (!skip.has(keyOf(entity, row))) await upsertLocal(entity, row);
      }
      cursor = data[data.length - 1].updated_at as string;
      await setCursor(entity, cursor);
      if (data.length < PAGE) break;
    }
  }
}
