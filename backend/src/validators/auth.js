import { z } from "zod";

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email format"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
});

export const registerSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name is too long'),

    role: z.enum(
        ["ADMIN", "RECEPTIONIST", "DOCTOR"],
        {
            errorMap: () => ({
                message: "Role must be ADMIN, RECEPTIONIST, or DOCTOR"
            })
        }
    ),

    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email format"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
});