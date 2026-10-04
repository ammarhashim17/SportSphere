import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { UserRole } from '../core/schemas';

export const profile = sqliteTable('profile', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull().default(''),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  roles: text('roles', { mode: 'json' }).$type<UserRole[]>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  logoUrl: text('logo_url'),
  colour: text('colour'),
  location: text('location'),
  description: text('description'),
  createdBy: text('created_by').notNull(),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  role: text('role', { enum: ['BAT', 'BOWL', 'AR', 'WK'] })
    .notNull()
    .default('BAT'),
  battingStyle: text('batting_style', { enum: ['right', 'left'] }),
  bowlingStyle: text('bowling_style'),
  dateOfBirth: text('date_of_birth'),
  linkedProfileId: text('linked_profile_id'),
  createdBy: text('created_by').notNull(),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const teamPlayers = sqliteTable(
  'team_players',
  {
    teamId: text('team_id').notNull(),
    playerId: text('player_id').notNull(),
    jerseyNo: integer('jersey_no'),
    isCaptain: integer('is_captain', { mode: 'boolean' }).notNull().default(false),
    isViceCaptain: integer('is_vice_captain', { mode: 'boolean' }).notNull().default(false),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.playerId] })],
);

/** Pending changes to push to Supabase (ADR-09). One row per local write, pushed in order. */
export const syncOutbox = sqliteTable('sync_outbox', {
  id: text('id').primaryKey(),
  entity: text('entity').notNull(),
  entityKey: text('entity_key').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
});

export const syncState = sqliteTable('sync_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
