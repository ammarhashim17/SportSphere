import { can } from '../permissions';

test('admin can do anything', () => expect(can(['admin'], 'users.manage')).toBe(true));
test('team manager creates teams but edits only own', () => {
  expect(can(['team_manager'], 'team.create')).toBe(true);
  expect(can(['team_manager'], 'team.edit', { userId: 'a', ownerId: 'b' })).toBe(false);
  expect(can(['team_manager'], 'team.edit', { userId: 'a', ownerId: 'a' })).toBe(true);
});
test('viewer cannot create anything', () => {
  expect(can(['viewer'], 'team.create')).toBe(false);
  expect(can(['viewer'], 'player.create')).toBe(false);
});
test('player edits own linked profile', () =>
  expect(
    can(['player'], 'player.edit', {
      userId: 'u',
      ownerId: 'x',
      linkedProfileId: 'u',
    }),
  ).toBe(true));
