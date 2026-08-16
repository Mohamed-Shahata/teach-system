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
/** E.164-ish free text — the center matches phones manually (manual payments), no strict format enforced. */
const phoneField = z.string().trim().min(6).max(20);
/** Student's age in years — optional, shown alongside `stageId` in the admin create-student form. */
const ageField = z.number().int().min(2).max(25);
/** ref into `subjects` — the single subject a teacher is assigned to teach (one specialization per teacher). */
const subjectIdField = z.string().min(1);

/** Roles an Admin may assign when creating an account. Never `admin` itself in the MVP. */
export const adminCreatableRoleSchema = z.enum(["teacher", "student"]);
export type AdminCreatableRole = z.infer<typeof adminCreatableRoleSchema>;

/**
 * `POST /api/admin/accounts` body. `stageId`/`age` are only meaningful for
 * `role === "student"`; `subjectId` only for `role === "teacher"` — hence
 * the cross-field `refine` rather than making either unconditionally
 * required.
 */
export const createAccountSchema = z
  .object({
    role: adminCreatableRoleSchema,
    email: emailField,
    displayName: displayNameField,
    phone: phoneField.optional(),
    stageId: stageIdField.optional(),
    age: ageField.optional(),
    subjectId: subjectIdField.optional(),
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

/**
 * `PATCH /api/admin/teachers/{id}` and `/api/admin/students/{id}` body —
 * TASK-1903/1904's deactivate/reactivate action.
 */
export const updateAccountStatusSchema = z.object({
  disabled: z.boolean(),
});
export type UpdateAccountStatusInput = z.infer<typeof updateAccountStatusSchema>;

/**
 * `PATCH /api/admin/settings` body — TASK-1907's Admin account settings
 * (display name only; password change goes through the existing reset-link
 * flow, not a direct new-password field — see ADR 0005).
 */
export const updateDisplayNameSchema = z.object({
  displayName: displayNameField,
});
export type UpdateDisplayNameInput = z.infer<typeof updateDisplayNameSchema>;

/**
 * `PATCH /api/student/settings` (and any future self-service settings
 * endpoint) avatar body. `avatarUrl`/`avatarPublicId` always arrive
 * together — set from a completed Cloudinary upload (`target: "avatar"`,
 * see `uploadService`), never a bare client-typed URL, per "never trust
 * client-supplied ... data" (`authorization/README.md`) — the server
 * doesn't re-verify the URL, but the upload it came from was already
 * signed/authorized server-side.
 */
export const updateAvatarSchema = z.object({
  avatarUrl: z.string().trim().url().max(2048),
  avatarPublicId: z.string().trim().min(1).max(300),
});
export type UpdateAvatarInput = z.infer<typeof updateAvatarSchema>;

/**
 * `PATCH /api/admin/teachers/{id}/permissions` body — Phase 5's per-teacher
 * "can create students" flag (`users/{uid}.canCreateStudents`).
 */
export const updateTeacherPermissionsSchema = z.object({
  canCreateStudents: z.boolean(),
});
export type UpdateTeacherPermissionsInput = z.infer<typeof updateTeacherPermissionsSchema>;
