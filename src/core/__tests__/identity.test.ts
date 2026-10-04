import { crestText, initialsOf, readableTextColor } from '../identity';

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
