const t = require('./src/theme/tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { ...t.colors, brand: t.brand },
      borderRadius: t.borderRadius,
      spacing: t.spacing,
      fontFamily: t.fontFamily,
      fontSize: t.fontSize,
    },
  },
  plugins: [],
};
