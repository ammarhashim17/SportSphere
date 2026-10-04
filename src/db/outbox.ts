import * as Crypto from 'expo-crypto';
import { toServer } from '@/core/caseMap';
import type { Tx } from './client';
import { syncOutbox } from './schema';

export type SyncEntity = 'teams' | 'players' | 'team_players';

/** Call INSIDE the same transaction as the local write. Always pass the FULL row (the server upsert needs every NOT NULL column). */
export async function enqueue(
  tx: Tx,
  entity: SyncEntity,
  entityKey: string,
  row: Record<string, unknown>,
): Promise<void> {
  await tx.insert(syncOutbox).values({
    id: Crypto.randomUUID(),
    entity,
    entityKey,
    payload: JSON.stringify(toServer(row)),
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
}
