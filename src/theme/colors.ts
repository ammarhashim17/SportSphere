import tokens from './tokens.json';

/** Resolved hex values for places where a className cannot be used (icon colours, gradients, native props). */
export const colors = { ...tokens.colors, ...tokens.brand } as const;
