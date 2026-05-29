import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email address.')
    .email('Please enter a valid email format.'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be under 128 characters.'),
});