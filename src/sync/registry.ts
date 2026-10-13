/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/db/client';
import {
  deliveries,
  innings,
  matches,
  playingXi,
  players,
  scoreCorrections,
  teamPlayers,
  teams,
} from '@/db/schema';

export type SyncEntity =
  | 'teams'
  | 'players'
  | 'team_players'
  | 'matches'
  | 'playing_xi'
  | 'innings'
  | 'deliveries'
  | 'score_corrections';

/** Parents before children (foreign-key order). The outbox is pushed in write order; this order is used for pulls. */
export const SYNC_ENTITIES: readonly SyncEntity[] = [
  'teams',
  'players',
  'team_players',
  'matches',
  'playing_xi',
  'innings',
  'deliveries',
  'score_corrections',
];

/**
 * What a device downloads:
 *  all            – every row
 *  my-matches     – only rows belonging to matches I created or score
 *  my-innings     – only rows belonging to innings of those matches
 *  none           – push only (audit rows are kept on the device that wrote them and on the server)
 */
export type PullScope = 'all' | 'my-matches' | 'my-innings' | 'none';

export const PULL_SCOPE: Record<SyncEntity, PullScope> = {
  teams: 'all',
  players: 'all',
  team_players: 'all',
  matches: 'all',
  playing_xi: 'my-matches',
  innings: 'my-matches',
  deliveries: 'my-innings',
  score_corrections: 'none',
};

/** Server column used to apply a scope filter. */
export const SCOPE_COLUMN: Partial<Record<SyncEntity, string>> = {
  playing_xi: 'match_id',
  innings: 'match_id',
  deliveries: 'innings_id',
};

export const conflictTarget = (e: SyncEntity): string =>
  e === 'team_players' ? 'team_id,player_id' : e === 'playing_xi' ? 'match_id,player_id' : 'id';

/** Key used to match outbox rows with pulled rows (row is camelCase). */
export const keyOf = (e: SyncEntity, row: any): string =>
  e === 'team_players'
    ? `${row.teamId}:${row.playerId}`
    : e === 'playing_xi'
      ? `${row.matchId}:${row.playerId}`
      : row.id;

export async function upsertLocal(e: SyncEntity, row: any): Promise<void> {
  switch (e) {
    case 'teams':
      await db.insert(teams).values(row).onConflictDoUpdate({ target: teams.id, set: row });
      return;
    case 'players':
      await db.insert(players).values(row).onConflictDoUpdate({ target: players.id, set: row });
      return;
    case 'team_players':
      await db
        .insert(teamPlayers)
        .values(row)
        .onConflictDoUpdate({ target: [teamPlayers.teamId, teamPlayers.playerId], set: row });
      return;
    case 'matches':
      await db.insert(matches).values(row).onConflictDoUpdate({ target: matches.id, set: row });
      return;
    case 'playing_xi':
      await db
        .insert(playingXi)
        .values(row)
        .onConflictDoUpdate({ target: [playingXi.matchId, playingXi.playerId], set: row });
      return;
    case 'innings':
      await db.insert(innings).values(row).onConflictDoUpdate({ target: innings.id, set: row });
      return;
    case 'deliveries':
      await db
        .insert(deliveries)
        .values(row)
        .onConflictDoUpdate({ target: deliveries.id, set: row });
      return;
    case 'score_corrections':
      await db
        .insert(scoreCorrections)
        .values(row)
        .onConflictDoUpdate({ target: scoreCorrections.id, set: row });
      return;
  }
}
