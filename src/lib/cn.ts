/** Joins class names, ignoring falsy values. NOTE: it does NOT resolve conflicts — never pass two classes that set the same property. */
export const cn = (...parts: (string | false | null | undefined)[]): string =>
  parts.filter(Boolean).join(' ');
