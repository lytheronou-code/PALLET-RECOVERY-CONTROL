import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email obbligatoria").email("Email non valida"),
  password: z.string().min(1, "Password obbligatoria"),
});

export const signupSchema = z.object({
  email: z.string().trim().min(1, "Email obbligatoria").email("Email non valida"),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
});

export const onboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Il nome deve avere almeno 2 caratteri")
    .max(200, "Il nome è troppo lungo"),
});
