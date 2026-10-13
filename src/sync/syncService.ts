/* eslint-disable @typescript-eslint/no-explicit-any */
import NetInfo from '@react-native-community/netinfo';
import { and, asc, count, eq, inArray, isNull, or } from 'drizzle-orm';
import { fromServer } from '@/core/caseMap';
import { db } from '@/db/client';
import { innings, matches, profile, syncOutbox, syncState } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import {
  conflictTarget,
  keyOf,
  PULL_SCOPE,
  SCOPE_COLUMN,
  SYNC_ENTITIES,
  upsertLocal,
  type SyncEntity,
} from './registry';
import { useSyncStore } from './syncStore';

type Entity = SyncEntity;
const EPOCH = '1970-01-01T00:00:00.000Z';
const PAGE = 500;
const PUSH_BATCH = 50;
const IN_CHUNK = 40;

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

/**
 * Sends outbox rows in the order they were written. Consecutive rows for the same entity are sent as one request
 * (latest payload wins per key). Stops at the first failure so order is preserved.
 */
async function push(): Promise<void> {
  for (;;) {
    const rows = await db.select().from(syncOutbox).orderBy(asc(syncOutbox.createdAt)).limit(200);
    if (rows.length === 0) return;
    const entity = rows[0]!.entity as Entity;
    const group = [];
    for (const r of rows) {
      if (r.entity !== entity || group.length >= PUSH_BATCH) break;
      group.push(r);
    }
    const latest = new Map<string, unknown>();
    for (const r of group) latest.set(r.entityKey, JSON.parse(r.payload));
    const { error } = await (supabase as any)
      .from(entity)
      .upsert([...latest.values()], { onConflict: conflictTarget(entity) });
    if (error) {
      const first = group[0]!;
      await db
        .update(syncOutbox)
        .set({ attempts: first.attempts + 1, lastError: error.message })
        .where(eq(syncOutbox.id, first.id));
      throw new Error(`${entity}: ${error.message}`);
    }
    await db.delete(syncOutbox).where(
      inArray(
        syncOutbox.id,
        group.map((g) => g.id),
      ),
    );
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
  for (const entity of SYNC_ENTITIES) {
    const scope = PULL_SCOPE[entity];
    if (scope === 'none') continue;
    const cursor = await getCursor(entity);
    let newest = cursor;
    const skip = await pending(entity);

    const filters: ({ column: string; ids: string[] } | null)[] = [];
    if (scope === 'all') filters.push(null);
    else {
      const ids = scope === 'my-matches' ? await myMatchIds(userId) : await myInningsIds(userId);
      const column = SCOPE_COLUMN[entity]!;
      for (let i = 0; i < ids.length; i += IN_CHUNK)
        filters.push({ column, ids: ids.slice(i, i + IN_CHUNK) });
    }

    for (const f of filters) {
      let from = cursor;
      for (;;) {
        let q = (supabase as any)
          .from(entity)
          .select('*')
          .gt('updated_at', from)
          .order('updated_at', { ascending: true })
          .limit(PAGE);
        if (f) q = q.in(f.column, f.ids);
        const { data, error } = await q;
        if (error) throw new Error(`${entity}: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const raw of data) {
          const row = fromServer(raw);
          if (!skip.has(keyOf(entity, row))) await upsertLocal(entity, row);
        }
        from = data[data.length - 1].updated_at as string;
        if (from > newest) newest = from;
        if (data.length < PAGE) break;
      }
    }
    if (newest !== cursor) await setCursor(entity, newest);
  }
}

/** Matches I created or score (local copy, already pulled). */
async function myMatchIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        isNull(matches.archivedAt),
        or(eq(matches.createdBy, userId), eq(matches.scorerId, userId)),
      ),
    );
  return rows.map((r) => r.id);
}

async function myInningsIds(userId: string): Promise<string[]> {
  const ids = await myMatchIds(userId);
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: innings.id })
    .from(innings)
    .where(inArray(innings.matchId, ids));
  return rows.map((r) => r.id);
}
