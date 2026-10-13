import { crestText, initialsOf, readableTextColor, shortName, surname } from '../identity';

test('crestText prefers short name', () => expect(crestText('ncc')).toBe('NCC'));
test('crestText falls back to name initials', () =>
  expect(crestText('', 'Riverside XI')).toBe('RX'));
test('initialsOf', () => {
  expect(initialsOf('Rohit Sharma')).toBe('RS');
  expect(initialsOf('')).toBe('?');
});
test('readableTextColor', () => {
  expect(readableTextColor('#0D5C3A')).toBe('#FFFFFF');
  expect(readableTextColor('#A9F3C5')).toBe('#0B1C30');
});

test('shortName / surname', () => {
  expect(shortName('Rohit Sharma')).toBe('R. Sharma');
  expect(shortName('Rohit Gurunath Sharma')).toBe('R. Sharma');
  expect(shortName('Sharma')).toBe('Sharma');
  expect(shortName('  ')).toBe('');
  expect(surname('Mohammed Ali')).toBe('Ali');
});
