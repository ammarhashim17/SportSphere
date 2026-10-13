import { z } from 'zod';

export const FORMATS = ['T20', 'ODI', 'CUSTOM'] as const;
export type MatchFormat = (typeof FORMATS)[number];

export const FORMAT_DEFAULT_OVERS: Record<MatchFormat, number> = { T20: 20, ODI: 50, CUSTOM: 10 };

/** Default bowler quota: T20 → 4, ODI → 10, custom → ceil(overs / 5) (never below 1). 0 = unlimited. */
export function defaultMaxOversPerBowler(format: MatchFormat, overs: number): number {
  if (format === 'T20') return 4;
  if (format === 'ODI') return 10;
  return Math.max(1, Math.ceil(overs / 5));
}

export type TossDecision = 'bat' | 'bowl';

export function battingFirstTeamId(
  teamAId: string,
  teamBId: string,
  tossWinnerId: string,
  decision: TossDecision,
): string {
  const other = tossWinnerId === teamAId ? teamBId : teamAId;
  return decision === 'bat' ? tossWinnerId : other;
}

export const matchBasicsSchema = z
  .object({
    teamAId: z.string().min(1, 'Choose Team A'),
    teamBId: z.string().min(1, 'Choose Team B'),
    format: z.enum(FORMATS),
    oversPerInnings: z.number().int().min(1, 'At least 1 over').max(50, 'At most 50 overs'),
    maxOversPerBowler: z.number().int().min(0).max(50),
    freeHitEnabled: z.boolean(),
    scheduledAt: z.string().min(1, 'Choose a date and time'),
    venue: z.string().trim().max(80).optional().nullable(),
    stage: z.string().trim().max(60).optional().nullable(),
    tournamentName: z.string().trim().max(80).optional().nullable(),
  })
  .refine((v) => v.teamAId !== v.teamBId, {
    path: ['teamBId'],
    message: 'Choose two different teams',
  });
export type MatchBasics = z.infer<typeof matchBasicsSchema>;

export interface XiEntry {
  playerId: string;
  isCaptain?: boolean;
  isKeeper?: boolean;
}

/** Returns an error message or null. `size` = players per side (default 11). */
export function validateXi(entries: readonly XiEntry[], size = 11): string | null {
  if (new Set(entries.map((e) => e.playerId)).size !== entries.length)
    return 'A player is selected twice.';
  if (entries.length !== size) return `Select exactly ${size} players (${entries.length}/${size}).`;
  if (entries.filter((e) => e.isCaptain).length > 1) return 'Only one captain.';
  if (entries.filter((e) => e.isKeeper).length > 1) return 'Only one wicket-keeper.';
  return null;
}

/** Players may not play for both sides in one match. */
export function xiOverlap(a: readonly XiEntry[], b: readonly XiEntry[]): string[] {
  const ids = new Set(a.map((x) => x.playerId));
  return b.map((x) => x.playerId).filter((id) => ids.has(id));
}
