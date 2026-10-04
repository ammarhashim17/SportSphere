export const heroGradient = {
  colors: ['#0D5C3A', '#1E8E5A'] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const; // CSS: linear-gradient(135deg, #0D5C3A 0%, #1E8E5A 100%)
