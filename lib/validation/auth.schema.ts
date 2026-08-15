import { z } from "zod";

export const userRoleSchema = z.enum(["teacher", "student"]);
export type UserRole = z.infer<typeof userRoleSchema>;

/**
 * What the client submits to POST /api/auth/register.
 *
 * `idToken` proves the Firebase Auth account (created client-side via
 * `createUserWithEmailAndPassword`) belongs to this request. `role` here is
 * only the user's *registration intent* — the server re-derives and stores
 * it independently and never trusts a `role` on any later request body; see
 * docs/authorization/README.md.
 */
export const registerSchema = z.object({
  idToken: z.string().min(1),
  role: userRoleSchema,
  displayName: z.string().trim().min(2).max(80),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** What the client-side sign-up form collects before calling Firebase Auth. */
export const registerFormSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
    role: userRoleSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.register.errors.passwordMismatch",
    path: ["confirmPassword"],
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;
