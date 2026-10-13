import {
  battingFirstTeamId,
  defaultMaxOversPerBowler,
  matchBasicsSchema,
  validateXi,
  xiOverlap,
} from '../matchSetup';

test('batting first', () => {
  expect(battingFirstTeamId('A', 'B', 'A', 'bat')).toBe('A');
  expect(battingFirstTeamId('A', 'B', 'A', 'bowl')).toBe('B');
  expect(battingFirstTeamId('A', 'B', 'B', 'bat')).toBe('B');
  expect(battingFirstTeamId('A', 'B', 'B', 'bowl')).toBe('A');
});
test('bowler quota defaults', () => {
  expect(defaultMaxOversPerBowler('T20', 20)).toBe(4);
  expect(defaultMaxOversPerBowler('ODI', 50)).toBe(10);
  expect(defaultMaxOversPerBowler('CUSTOM', 12)).toBe(3);
  expect(defaultMaxOversPerBowler('CUSTOM', 3)).toBe(1);
});
test('basics validation', () => {
  const base = {
    teamAId: 'a',
    teamBId: 'b',
    format: 'T20',
    oversPerInnings: 20,
    maxOversPerBowler: 4,
    freeHitEnabled: true,
    scheduledAt: '2026-10-10T10:00:00Z',
  };
  expect(matchBasicsSchema.safeParse(base).success).toBe(true);
  expect(matchBasicsSchema.safeParse({ ...base, teamBId: 'a' }).success).toBe(false);
  expect(matchBasicsSchema.safeParse({ ...base, oversPerInnings: 0 }).success).toBe(false);
});
test('xi validation', () => {
  const xi = Array.from({ length: 11 }, (_, i) => ({ playerId: `p${i}` }));
  expect(validateXi(xi)).toBeNull();
  expect(validateXi(xi.slice(0, 9))).toContain('9/11');
  expect(validateXi([...xi.slice(0, 10), { playerId: 'p0' }])).toContain('twice');
  expect(validateXi(xi.map((x, i) => ({ ...x, isCaptain: i < 2 })))).toContain('captain');
  expect(xiOverlap([{ playerId: 'x' }], [{ playerId: 'x' }, { playerId: 'y' }])).toEqual(['x']);
});
