const required = (name: string, value: string | undefined): string => {
  if (!value)
    throw new Error(
      `Missing environment variable: ${name}. Copy .env.example to .env and fill it in.`,
    );
  return value;
};

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  useFixtures: process.env.EXPO_PUBLIC_USE_FIXTURES === 'true',
} as const;
