/** Up to 4 uppercase letters/digits for a crest. */
export function crestText(shortName: string | null | undefined, fallbackName = ''): string {
  const s = (shortName ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (s.length >= 2) return s.slice(0, 4);
  const initials = fallbackName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (initials || 'T').slice(0, 4);
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

/** Black-ish or white text, whichever is readable on the given #RRGGBB background (WCAG relative luminance). */
export function readableTextColor(hex: string): '#FFFFFF' | '#0B1C30' {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? '#0B1C30' : '#FFFFFF';
}
