import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
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

// ───────────────────────── Phase 2: matches & scoring ─────────────────────────

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  teamAId: text('team_a_id').notNull(),
  teamBId: text('team_b_id').notNull(),
  format: text('format', { enum: ['T20', 'ODI', 'CUSTOM'] })
    .notNull()
    .default('T20'),
  oversPerInnings: integer('overs_per_innings').notNull(),
  ballsPerOver: integer('balls_per_over').notNull().default(6),
  maxOversPerBowler: integer('max_overs_per_bowler').notNull().default(0),
  freeHitEnabled: integer('free_hit_enabled', { mode: 'boolean' }).notNull().default(true),
  playersPerSide: integer('players_per_side').notNull().default(11),
  scheduledAt: text('scheduled_at').notNull(),
  venue: text('venue'),
  stage: text('stage'),
  tournamentName: text('tournament_name'),
  tossWinnerId: text('toss_winner_id'),
  tossDecision: text('toss_decision', { enum: ['bat', 'bowl'] }),
  status: text('status', {
    enum: ['upcoming', 'live', 'innings_break', 'completed', 'abandoned', 'no_result'],
  })
    .notNull()
    .default('upcoming'),
  resultType: text('result_type', { enum: ['win', 'tie', 'no_result', 'abandoned'] }),
  winnerTeamId: text('winner_team_id'),
  marginType: text('margin_type', { enum: ['runs', 'wickets'] }),
  marginValue: integer('margin_value'),
  resultSummary: text('result_summary'),
  playerOfMatchId: text('player_of_match_id'),
  scorerId: text('scorer_id'),
  createdBy: text('created_by').notNull(),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const playingXi = sqliteTable(
  'playing_xi',
  {
    matchId: text('match_id').notNull(),
    playerId: text('player_id').notNull(),
    teamId: text('team_id').notNull(),
    battingOrder: integer('batting_order').notNull(),
    isCaptain: integer('is_captain', { mode: 'boolean' }).notNull().default(false),
    isKeeper: integer('is_keeper', { mode: 'boolean' }).notNull().default(false),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.playerId] })],
);

export const innings = sqliteTable('innings', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull(),
  inningsNo: integer('innings_no').notNull(),
  battingTeamId: text('batting_team_id').notNull(),
  bowlingTeamId: text('bowling_team_id').notNull(),
  openingStrikerId: text('opening_striker_id').notNull(),
  openingNonStrikerId: text('opening_non_striker_id').notNull(),
  openingBowlerId: text('opening_bowler_id'),
  target: integer('target'),
  status: text('status', { enum: ['in_progress', 'completed'] })
    .notNull()
    .default('in_progress'),
  endReason: text('end_reason', {
    enum: ['ALL_OUT', 'OVERS_COMPLETE', 'TARGET_REACHED', 'DECLARED', 'MANUAL'],
  }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const deliveries = sqliteTable(
  'deliveries',
  {
    id: text('id').primaryKey(),
    inningsId: text('innings_id').notNull(),
    seq: integer('seq').notNull(),
    kind: text('kind', { enum: ['BALL', 'DEAD'] })
      .notNull()
      .default('BALL'),
    strikerId: text('striker_id').notNull(),
    nonStrikerId: text('non_striker_id').notNull(),
    bowlerId: text('bowler_id').notNull(),
    runsOffBat: integer('runs_off_bat').notNull().default(0),
    isBoundary: integer('is_boundary', { mode: 'boolean' }).notNull().default(false),
    extraType: text('extra_type', { enum: ['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'] }),
    extraRuns: integer('extra_runs').notNull().default(0),
    extraSubType: text('extra_sub_type', { enum: ['BYE', 'LEG_BYE'] }),
    wicketType: text('wicket_type', {
      enum: [
        'BOWLED',
        'CAUGHT',
        'LBW',
        'RUN_OUT',
        'STUMPED',
        'HIT_WICKET',
        'OBSTRUCTING',
        'HIT_TWICE',
        'RETIRED_HURT',
        'RETIRED_OUT',
      ],
    }),
    playerOutId: text('player_out_id'),
    fielderId: text('fielder_id'),
    incomingBatterId: text('incoming_batter_id'),
    incomingAt: text('incoming_at', { enum: ['STRIKER', 'NON_STRIKER'] }),
    voided: integer('voided', { mode: 'boolean' }).notNull().default(false),
    version: integer('version').notNull().default(1),
    deviceId: text('device_id'),
    createdBy: text('created_by'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('deliveries_innings_seq_uq').on(t.inningsId, t.seq),
    index('deliveries_innings_idx').on(t.inningsId),
  ],
);

export const scoreCorrections = sqliteTable('score_corrections', {
  id: text('id').primaryKey(),
  deliveryId: text('delivery_id').notNull(),
  action: text('action', { enum: ['UNDO', 'EDIT', 'REINSTATE'] }).notNull(),
  oldJson: text('old_json', { mode: 'json' }),
  newJson: text('new_json', { mode: 'json' }),
  reason: text('reason'),
  editedBy: text('edited_by'),
  editedAt: text('edited_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
