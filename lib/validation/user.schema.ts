import { z } from "zod";

/**
 * TASK-3201 — validation for the student-facing self-service "my
 * profile" fields, layered directly onto the existing `users` doc
 * (`userRepository.ts`) rather than a new collection — unlike the
 * teacher's `teacherProfiles` (TASK-3101/3102), a student profile here
 * is just a couple of fields `userRepository` already owns
 * (`displayName`) plus one new one (`birthDate`). `avatarUrl` is
 * intentionally not in this schema — it still goes through TASK-1005's
 * existing `updateAvatarSchema` / `PATCH /api/student/settings/avatar`
 * flow rather than duplicating that here. `stageId` is never accepted
 * from the client on this route — it's read-only for a student
 * (changing grade level is an Admin action, per
 * `phase-32-student-experience.md`'s TASK-3201 note).
 */

const displayNameField = z.string().trim().min(2).max(80);

/** Plausible student age range — matches `account.schema.ts`'s existing `ageField` bounds (2–25 years old). */
const MIN_STUDENT_AGE = 2;
const MAX_STUDENT_AGE = 25;

/**
 * Computes a whole-years age from an ISO `YYYY-MM-DD` birth date, as of
 * `today` (defaults to now). Exported so `studentProfileService` can
 * reuse the exact same calculation for the display-only `age` field it
 * derives at read time — storing a raw `age` number would go stale
 * (Claude's suggestion, flagged over a raw `age` field in
 * `phase-32-student-experience.md`'s TASK-3201 note; `account.schema.ts`'s
 * `ageField` remains as-is for the existing Admin-set-at-creation path,
 * unrelated to this self-service one).
 */
export function computeAgeFromBirthDate(birthDate: string, today: Date = new Date()): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  let age = today.getUTCFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getUTCMonth() + 1 > month || (today.getUTCMonth() + 1 === month && today.getUTCDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function isPlausibleBirthDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.getTime() > Date.now()) return false; // never in the future
  const age = computeAgeFromBirthDate(value);
  return age >= MIN_STUDENT_AGE && age <= MAX_STUDENT_AGE;
}

/** ISO `YYYY-MM-DD` date-only string, bounded to a plausible student age. */
const birthDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "errors.validation")
  .refine(isPlausibleBirthDate, "errors.validation");

/**
 * `PATCH /api/student/profile` body — every field optional so the
 * student can save a single changed field, but the whole body can't be
 * empty (same "no-op patch" guard as `updateTeacherProfileDetailsSchema`).
 */
export const updateStudentOwnProfileSchema = z
  .object({
    displayName: displayNameField,
    birthDate: birthDateField,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "errors.validation",
  });
export type UpdateStudentOwnProfileInput = z.infer<typeof updateStudentOwnProfileSchema>;
