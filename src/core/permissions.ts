import type { UserRole } from './schemas';

export type Action =
  | 'team.create'
  | 'team.edit'
  | 'squad.manage'
  | 'player.create'
  | 'player.edit'
  | 'match.create'
  | 'match.score'
  | 'users.manage';

type Ctx = { userId?: string; ownerId?: string | null; linkedProfileId?: string | null };

const has = (roles: readonly UserRole[], ...wanted: UserRole[]) =>
  wanted.some((r) => roles.includes(r));

/** UI-side mirror of the RLS rules (SRS 11). The database remains the real enforcement. */
export function can(roles: readonly UserRole[], action: Action, ctx: Ctx = {}): boolean {
  if (roles.includes('admin')) return true;
  const owner = !!ctx.userId && ctx.userId === ctx.ownerId;
  switch (action) {
    case 'team.create':
      return has(roles, 'team_manager');
    case 'team.edit':
    case 'squad.manage':
      return has(roles, 'team_manager') && owner;
    case 'player.create':
      return has(roles, 'team_manager', 'scorer');
    case 'player.edit':
      return owner || (!!ctx.userId && ctx.userId === ctx.linkedProfileId);
    case 'match.create':
      return has(roles, 'team_manager', 'scorer');
    case 'match.score':
      return has(roles, 'scorer');
    case 'users.manage':
      return false;
  }
}
