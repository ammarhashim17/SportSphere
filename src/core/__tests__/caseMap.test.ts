import { fromServer, toServer } from '../caseMap';

test('round trip', () => {
  const row = { id: '1', shortName: 'NCC', isViceCaptain: false, archivedAt: null };
  expect(toServer(row)).toEqual({
    id: '1',
    short_name: 'NCC',
    is_vice_captain: false,
    archived_at: null,
  });
  expect(fromServer(toServer(row))).toEqual(row);
});
