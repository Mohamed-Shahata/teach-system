import { z } from "zod";

/**
 * Full set of roles a `users/{uid}` doc can carry, per
 * docs/database/collections.md. `admin` accounts are provisioned directly
 * (Firestore/Admin SDK), never through self-registration — see
 * `registrationRoleSchema` below for the registration-time subset.
 */
export const roleSchema = z.enum(["admin", "teacher", "student"]);
export type UserRole = z.infer<typeof roleSchema>;

/** The subset of roles a user may request for themselves at sign-up. */
export const registrationRoleSchema = z.enum(["teacher", "student"]);
export type RegistrationRole = z.infer<typeof registrationRoleSchema>;

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
  role: registrationRoleSchema,
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
    role: registrationRoleSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.register.errors.passwordMismatch",
    path: ["confirmPassword"],
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;
