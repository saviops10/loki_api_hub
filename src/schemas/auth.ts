import { z } from "zod";

export const LoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

export const RegisterSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/\d/, "Password must contain at least one number")
    .regex(/[@$!%*?&]/, "Password must contain at least one special character (@$!%*?&)"),
  termsAccepted: z.boolean().refine(v => v === true, "You must accept the terms"),
  privacyAccepted: z.boolean().refine(v => v === true, "You must accept the privacy policy")
});
