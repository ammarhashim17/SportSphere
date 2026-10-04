import { z } from 'zod';

export const USER_ROLES = ['admin', 'scorer', 'team_manager', 'player', 'viewer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const email = z.string().trim().toLowerCase().email('Enter a valid email');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your name').max(60),
    email,
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });
export type SignupForm = z.infer<typeof signupSchema>;

export const forgotSchema = z.object({ email });
export type ForgotForm = z.infer<typeof forgotSchema>;

export const teamSchema = z.object({
  name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(60),
  shortName: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,4}$/, 'Short name must be 2 to 4 letters/digits'),
  colour: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (#RRGGBB)')
    .optional()
    .nullable(),
  location: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
});
export type TeamForm = z.infer<typeof teamSchema>;

export const playerSchema = z.object({
  name: z.string().trim().min(2, 'Player name must be at least 2 characters').max(80),
  role: z.enum(['BAT', 'BOWL', 'AR', 'WK']),
  battingStyle: z.enum(['right', 'left']).optional().nullable(),
  bowlingStyle: z.string().trim().max(50).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  jerseyNo: z.coerce.number().int().min(0).max(999).optional().nullable(),
  isCaptain: z.boolean().default(false),
  isViceCaptain: z.boolean().default(false),
  photoUrl: z.string().url().optional().nullable(),
});
export type PlayerForm = z.infer<typeof playerSchema>;
