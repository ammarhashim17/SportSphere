import * as Crypto from 'expo-crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { PlayerForm } from '@/core/schemas';
import { db } from '@/db/client';
import { enqueue } from '@/db/outbox';
import { players, teamPlayers } from '@/db/schema';
import { requestSync } from '@/sync/syncService';

export type PlayerRow = typeof players.$inferSelect;
export type TeamPlayerRow = typeof teamPlayers.$inferSelect;

export type SquadMember = PlayerRow & {
  jerseyNo: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  active: boolean;
};

export async function listPlayers(): Promise<PlayerRow[]> {
  return db
    .select()
    .from(players)
    .where(isNull(players.archivedAt))
    .orderBy(desc(players.createdAt));
}

export async function getPlayer(id: string): Promise<PlayerRow | null> {
  const [row] = await db
    .select()
    .from(players)
    .where(and(eq(players.id, id), isNull(players.archivedAt)));
  return row ?? null;
}

export async function createPlayer(input: PlayerForm, userId: string): Promise<PlayerRow> {
  const now = new Date().toISOString();
  const id = Crypto.randomUUID();
  const row: PlayerRow = {
    id,
    name: input.name,
    photoUrl: input.photoUrl ?? null,
    role: input.role,
    battingStyle: input.battingStyle ?? null,
    bowlingStyle: input.bowlingStyle ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    linkedProfileId: null,
    createdBy: userId,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.insert(players).values(row);
    await enqueue(tx, 'players', id, row as unknown as Record<string, unknown>);
  });

  requestSync();
  return row;
}

export async function updatePlayer(id: string, input: Partial<PlayerForm>): Promise<PlayerRow> {
  const [existing] = await db.select().from(players).where(eq(players.id, id));
  if (!existing) throw new Error('Player not found');

  const now = new Date().toISOString();
  const updated: PlayerRow = {
    ...existing,
    name: input.name ?? existing.name,
    photoUrl: input.photoUrl !== undefined ? input.photoUrl : existing.photoUrl,
    role: input.role ?? existing.role,
    battingStyle: input.battingStyle !== undefined ? input.battingStyle : existing.battingStyle,
    bowlingStyle: input.bowlingStyle !== undefined ? input.bowlingStyle : existing.bowlingStyle,
    dateOfBirth: input.dateOfBirth !== undefined ? input.dateOfBirth : existing.dateOfBirth,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.update(players).set(updated).where(eq(players.id, id));
    await enqueue(tx, 'players', id, updated as unknown as Record<string, unknown>);
  });

  requestSync();
  return updated;
}

export async function archivePlayer(id: string): Promise<void> {
  const [existing] = await db.select().from(players).where(eq(players.id, id));
  if (!existing) return;

  const now = new Date().toISOString();
  const updated: PlayerRow = {
    ...existing,
    archivedAt: now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx.update(players).set({ archivedAt: now, updatedAt: now }).where(eq(players.id, id));
    await enqueue(tx, 'players', id, updated as unknown as Record<string, unknown>);
  });

  requestSync();
}

export async function getTeamSquad(teamId: string): Promise<SquadMember[]> {
  const rows = await db
    .select({
      player: players,
      teamPlayer: teamPlayers,
    })
    .from(teamPlayers)
    .innerJoin(players, eq(teamPlayers.playerId, players.id))
    .where(
      and(eq(teamPlayers.teamId, teamId), eq(teamPlayers.active, true), isNull(players.archivedAt)),
    );

  return rows.map(({ player, teamPlayer }) => ({
    ...player,
    jerseyNo: teamPlayer.jerseyNo,
    isCaptain: teamPlayer.isCaptain,
    isViceCaptain: teamPlayer.isViceCaptain,
    active: teamPlayer.active,
  }));
}

export async function assignPlayerToTeam(
  teamId: string,
  playerId: string,
  options: {
    jerseyNo?: number | null;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
  } = {},
): Promise<TeamPlayerRow> {
  const now = new Date().toISOString();
  const row: TeamPlayerRow = {
    teamId,
    playerId,
    jerseyNo: options.jerseyNo ?? null,
    isCaptain: options.isCaptain ?? false,
    isViceCaptain: options.isViceCaptain ?? false,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx
      .insert(teamPlayers)
      .values(row)
      .onConflictDoUpdate({
        target: [teamPlayers.teamId, teamPlayers.playerId],
        set: row,
      });
    await enqueue(
      tx,
      'team_players',
      `${teamId}:${playerId}`,
      row as unknown as Record<string, unknown>,
    );
  });

  requestSync();
  return row;
}

export async function removePlayerFromTeam(teamId: string, playerId: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(teamPlayers)
    .where(and(eq(teamPlayers.teamId, teamId), eq(teamPlayers.playerId, playerId)));

  if (!existing) return;

  const now = new Date().toISOString();
  const row: TeamPlayerRow = {
    ...existing,
    active: false,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(teamPlayers)
      .set({ active: false, updatedAt: now })
      .where(and(eq(teamPlayers.teamId, teamId), eq(teamPlayers.playerId, playerId)));
    await enqueue(
      tx,
      'team_players',
      `${teamId}:${playerId}`,
      row as unknown as Record<string, unknown>,
    );
  });

  requestSync();
}
