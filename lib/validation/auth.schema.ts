import { z } from "zod";

/**
 * Full set of roles a `users/{uid}` doc can carry, per
 * docs/database/collections.md. All accounts are provisioned by an Admin
 * or Teacher (see `TASK-604`'s `accountService`) — there is no
 * self-registration path, so there is no separate "registration-time"
 * subset of roles.
 */
export const roleSchema = z.enum(["admin", "teacher", "student"]);
export type UserRole = z.infer<typeof roleSchema>;
