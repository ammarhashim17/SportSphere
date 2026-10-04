module.exports = {
  extends: ['expo'],
  ignorePatterns: [
    '/drizzle',
    '/design',
    '/android',
    '/ios',
    '/dist',
    'node_modules',
    '*.config.js',
  ],
  settings: {
    'import/resolver': {
      typescript: true,
      node: true,
    },
  },
  rules: {
    'import/no-unresolved': ['error', { ignore: ['@expo/vector-icons'] }],
  },
  overrides: [
    {
      files: ['src/core/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*'],
                message: 'src/core must stay pure TypeScript.',
              },
              {
                group: ['@/db/*', '@/lib/*', '@/features/*', '@/sync/*', '@/components/*'],
                message: 'src/core must not depend on app layers.',
              },
            ],
          },
        ],
      },
    },
  ],
};
