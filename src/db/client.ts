import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('scoresphere.db', { enableChangeListener: true });
export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Removes every locally stored row (used on sign-out and when a different user signs in). */
export async function clearLocalData(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(schema.teamPlayers);
    await tx.delete(schema.players);
    await tx.delete(schema.teams);
    await tx.delete(schema.profile);
    await tx.delete(schema.syncOutbox);
    await tx.delete(schema.syncState);
  });
}
