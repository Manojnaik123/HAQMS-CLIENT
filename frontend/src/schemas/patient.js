import { z } from "zod";

export const patientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),

  phoneNumber: z
    .string()
    .trim()
    .regex(
      /^[0-9]{10}$/,
      'Phone number must be exactly 10 digits'
    ),

  age: z.coerce
    .number()
    .int('Age must be a whole number')
    .min(0, 'Invalid age')
    .max(120, 'Invalid age'),

  gender: z.enum(['Male', 'Female', 'Other']),

  medicalHistory: z
    .string()
    .trim()
    .max(2000, 'Medical history is too long')
    .optional()
    .or(z.literal('')),
});