import { z } from "zod";

/**
 * Account-creation schemas — TASK-604.
 *
 * Accounts are never self-registered (see `authentication/README.md` —
 * "no public registration"); every `users/{uid}` doc is created by an
 * Admin (teacher or student) or a Teacher (student only), per
 * `architecture/ownership-model.md`.
 */

const emailField = z.string().trim().email().max(254);
const displayNameField = z.string().trim().min(2).max(80);
/** ref into `educationStages` — required for students, per `database/collections.md`. */
const stageIdField = z.string().min(1);

/** Roles an Admin may assign when creating an account. Never `admin` itself in the MVP. */
export const adminCreatableRoleSchema = z.enum(["teacher", "student"]);
export type AdminCreatableRole = z.infer<typeof adminCreatableRoleSchema>;

/**
 * `POST /api/admin/accounts` body. `stageId` is required when
 * `role === "student"` and meaningless for a teacher, hence the
 * cross-field `refine` rather than making it unconditionally required.
 */
export const createAccountSchema = z
  .object({
    role: adminCreatableRoleSchema,
    email: emailField,
    displayName: displayNameField,
    stageId: stageIdField.optional(),
  })
  .refine((data) => data.role !== "student" || !!data.stageId, {
    message: "errors.validation",
    path: ["stageId"],
  });
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/**
 * `POST /api/teacher/students` body — role is implicitly `student`, so
 * it's never accepted on the request (never trust client-supplied role
 * data, per `authorization/README.md`).
 */
export const createStudentSchema = z.object({
  email: emailField,
  displayName: displayNameField,
  stageId: stageIdField,
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
