import type { ViewStyle } from 'react-native';

export const shadow = {
  /** Level 1 card (DESIGN.md) */
  l1: { boxShadow: '0 2px 8px rgba(16, 24, 40, 0.06)' } satisfies ViewStyle,
  /** Level 2 */
  l2: {
    boxShadow: '0 8px 16px -4px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
  } satisfies ViewStyle,
  /** Level 3 */
  l3: {
    boxShadow: '0 20px 24px -4px rgba(16, 24, 40, 0.12), 0 8px 8px -4px rgba(16, 24, 40, 0.04)',
  } satisfies ViewStyle,
  /** Stitch top header: shadow-[0_1px_8px_rgba(0,0,0,0.04)] */
  header: { boxShadow: '0 1px 8px rgba(0, 0, 0, 0.04)' } satisfies ViewStyle,
  /** Stitch bottom nav: shadow-[0_-2px_12px_rgba(0,0,0,0.04)] */
  navTop: { boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)' } satisfies ViewStyle,
  /** Tailwind shadow-sm / shadow-md (used by Stitch keypad & bubbles) */
  sm: { boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' } satisfies ViewStyle,
  md: {
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  } satisfies ViewStyle,
  xl: {
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  } satisfies ViewStyle,
  /** Stitch live keypad */
  key: { boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)' } satisfies ViewStyle,
  keyExtra: { boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)' } satisfies ViewStyle,
  /** Stitch over-strip run bubble */
  bubble: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' } satisfies ViewStyle,
} as const;
