import * as Crypto from 'expo-crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { TeamForm } from '@/core/schemas';
import { db } from '@/db/client';
import { enqueue } from '@/db/outbox';
import { teams } from '@/db/schema';
import { requestSync } from '@/sync/syncService';

export type TeamRow = typeof teams.$inferSelect;

export async function listTeams(): Promise<TeamRow[]> {
  return db.select().from(teams).where(isNull(teams.archivedAt)).orderBy(desc(teams.createdAt));
}

export async function getTeam(id: string): Promise<TeamRow | null> {
  const [row] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, id), isNull(teams.archivedAt)));
  return row ?? null;
}

export async function createTeam(input: TeamForm, userId: string): Promise<TeamRow> {
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();
  const row: TeamRow = {
    id,
    name: input.name,
    shortName: input.shortName,
    colour: input.colour ?? null,
    location: input.location ?? null,
    description: input.description ?? null,
    logoUrl: input.logoUrl ?? null,
    createdBy: userId,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.insert(teams).values(row);
    await enqueue(tx, 'teams', id, row as unknown as Record<string, unknown>);
  });

  requestSync();
  return row;
}

export async function updateTeam(id: string, input: Partial<TeamForm>): Promise<TeamRow> {
  const [existing] = await db.select().from(teams).where(eq(teams.id, id));
  if (!existing) throw new Error('Team not found');

  const now = new Date().toISOString();
  const updated: TeamRow = {
    ...existing,
    name: input.name ?? existing.name,
    shortName: input.shortName ?? existing.shortName,
    colour: input.colour !== undefined ? input.colour : existing.colour,
    location: input.location !== undefined ? input.location : existing.location,
    description: input.description !== undefined ? input.description : existing.description,
    logoUrl: input.logoUrl !== undefined ? input.logoUrl : existing.logoUrl,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.update(teams).set(updated).where(eq(teams.id, id));
    await enqueue(tx, 'teams', id, updated as unknown as Record<string, unknown>);
  });

  requestSync();
  return updated;
}

export async function archiveTeam(id: string): Promise<void> {
  const [existing] = await db.select().from(teams).where(eq(teams.id, id));
  if (!existing) return;

  const now = new Date().toISOString();
  const updated: TeamRow = {
    ...existing,
    archivedAt: now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.update(teams).set({ archivedAt: now, updatedAt: now }).where(eq(teams.id, id));
    await enqueue(tx, 'teams', id, updated as unknown as Record<string, unknown>);
  });

  requestSync();
}
