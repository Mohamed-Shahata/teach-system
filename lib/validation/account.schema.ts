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
/** Age in years — optional; shown alongside `stageId` for students and standalone for teachers. */
const ageField = z.number().int().min(2).max(25);
/** refs into `subjects` — the subject(s) a teacher is assigned to teach (TASK-2402: a teacher may now have more than one). */
const subjectIdsField = z.array(z.string().min(1)).min(1);

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
    /** Optional at creation — the center matches phones manually for payments (see `phoneField`); can be added later via profile edit. */
    phone: phoneField.optional(),
    stageId: stageIdField.optional(),
    age: ageField.optional(),
    subjectIds: subjectIdsField.optional(),
  })
  .refine((data) => data.role !== "student" || !!data.stageId, {
    message: "errors.validation",
    path: ["stageId"],
  });
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/**
 * `PATCH /api/admin/students/{id}` profile-edit body (the Student
 * management "Edit" action) — every field optional so an admin can save
 * a single changed field without resubmitting the whole form.
 */
export const updateStudentProfileSchema = z.object({
  displayName: displayNameField.optional(),
  email: emailField.optional(),
  phone: phoneField.optional(),
  age: ageField.optional(),
  stageId: stageIdField.optional(),
  /** Same endpoint also carries the deactivate/reactivate toggle, so both can be saved in one request. */
  disabled: z.boolean().optional(),
});
export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;

/** `PATCH /api/admin/teachers/{id}` profile-edit body — the Teacher management "Edit" action. */
export const updateTeacherProfileSchema = z.object({
  displayName: displayNameField.optional(),
  email: emailField.optional(),
  phone: phoneField.optional(),
  subjectIds: subjectIdsField.optional(),
  disabled: z.boolean().optional(),
});
export type UpdateTeacherProfileInput = z.infer<typeof updateTeacherProfileSchema>;

/**
 * `POST /api/teacher/students` body — role is implicitly `student`, so
 * it's never accepted on the request (never trust client-supplied role
 * data, per `authorization/README.md`).
 *
 * `email` is optional here (unlike the Admin-facing `createAccountSchema`)
 * — the center primarily reaches students by phone, and login already
 * supports a phone identifier (`resolveLoginEmail`/`findByPhone`), so a
 * teacher can create an account with just a phone number. `phone`/`age`
 * are required for a teacher-created student, matching the extra fields
 * collected in the "Add a student" form.
 */
export const createStudentSchema = z.object({
  email: emailField.optional(),
  displayName: displayNameField,
  phone: phoneField,
  age: ageField,
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

/**
 * `PATCH /api/student/settings/push` and `/api/teacher/settings/push`
 * body — TASK-2604's per-user push on/off toggle
 * (`users/{uid}.pushEnabled`), separate from the in-app bell which
 * always stays on.
 */
export const updatePushEnabledSchema = z.object({
  enabled: z.boolean(),
});
export type UpdatePushEnabledInput = z.infer<typeof updatePushEnabledSchema>;
