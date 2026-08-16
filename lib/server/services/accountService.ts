import "server-only";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { userRepository } from "@/lib/server/repositories/userRepository";
import {
  EMPTY_TEACHER_PROFILE_STATS,
  teacherProfileRepository,
} from "@/lib/server/repositories/teacherProfileRepository";
import { systemStatsRepository } from "@/lib/server/repositories/systemStatsRepository";
import { assertRole } from "@/lib/auth/guards";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Session } from "@/lib/auth/session";
import type { CreateAccountInput, CreateStudentInput } from "@/lib/validation/account.schema";

/**
 * Account creation service — TASK-604.
 *
 * Provisions a Firebase Auth user + `users/{uid}` (+ `teacherProfiles/{uid}`
 * for teachers) for accounts created by an Admin or a Teacher. There is no
 * client-facing open registration (see `authentication/README.md`), so
 * this is now the only way a `users` doc is created.
 *
 * Credential delivery follows docs/decisions/0005: the Auth account gets a
 * random password nobody ever uses, and the response carries a one-time
 * password-reset link for the creator to relay to the new user directly.
 *
 * Note: `features/students.md` / `features/enrollment.md` describe a
 * teacher optionally pre-enrolling a new student in one of their own
 * courses at creation time. That always happens as a side effect of a
 * `payments` doc reaching `status: "confirmed"` (see phase-11-enrollment.md
 * TASK-1101/1104), and neither the payments nor the enrollment
 * repository/service exists yet (Phase 11, Not Started) — so that part is
 * intentionally not implemented here. `createStudentByTeacher` creates the
 * account only; wiring the optional pre-enrollment through the payments
 * flow belongs in Phase 11, once TASK-1104 lands.
 */

export interface CreatedAccount {
  uid: string;
  email: string;
  displayName: string;
  role: "teacher" | "student";
  /**
   * One-time Firebase password-reset link (docs/decisions/0005). Present
   * only in this response — never stored, never logged.
   */
  resetLink: string;
}

interface ProvisionAccountParams {
  /**
   * Optional when a Teacher creates a Student with only a phone number
   * (see `createStudentSchema`). Firebase Auth still needs *an* email to
   * create the user and to generate the reset link, so `provisionAccount`
   * falls back to a `phone`-derived placeholder — never shown to anyone
   * and never used for real delivery (see the "nothing is emailed
   * automatically" note on the Student manager form).
   */
  email?: string;
  displayName: string;
  role: "teacher" | "student";
  phone?: string;
  stageId?: string;
  age?: number;
  /** teacher-only: single ref into `subjects` — a teacher has exactly one specialization, stored on `teacherProfiles.subjectId`. */
  subjectId?: string;
  createdBy: { uid: string; role: "admin" | "teacher" };
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "teacher";
}

/**
 * `teacherProfiles.slug` is unique across all teachers (docs/database/
 * collections.md), unlike a course's per-teacher slug — so a collision
 * appends `-2`, `-3`, ... instead of rejecting, since there is no
 * "current teacher's own slugs" the caller could pick a different one
 * from; two teachers can share a `displayName`.
 */
async function uniqueTeacherSlug(displayName: string): Promise<string> {
  const base = slugify(displayName);
  let candidate = base;
  let suffix = 2;
  while (await teacherProfileRepository.findBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function isEmailAlreadyExists(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "auth/email-already-exists"
  );
}

/**
 * Long, random, never-returned password for the new Auth account — see
 * docs/decisions/0005. Nobody is ever meant to authenticate with it; the
 * new user sets their real password via the returned reset link.
 */
function randomUnusedPassword(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

/**
 * Firebase Auth needs *an* email to create the user and to generate the
 * password-reset link; a phone-only student (no `email` in the request)
 * gets one derived from their phone plus a random suffix so it's unique
 * and never collides with a real address. It's never surfaced to the
 * student or the teacher — login resolves by `phone` instead (see
 * `resolveLoginEmail`).
 */
function placeholderEmail(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "") || "student";
  return `${digits}.${crypto.randomUUID().slice(0, 8)}@placeholder.local`;
}

async function provisionAccount(params: ProvisionAccountParams): Promise<CreatedAccount> {
  const email = params.email ?? placeholderEmail(params.phone ?? crypto.randomUUID());

  let uid: string;
  try {
    const authUser = await adminAuth.createUser({
      email,
      password: randomUnusedPassword(),
      displayName: params.displayName,
    });
    uid = authUser.uid;
  } catch (err) {
    if (isEmailAlreadyExists(err)) {
      throw new ConflictError();
    }
    throw err;
  }

  const createdAt = Date.now();

  try {
    await userRepository.create({
      uid,
      email,
      displayName: params.displayName,
      role: params.role,
      createdBy: params.createdBy,
      createdAt,
      // Firestore Admin SDK rejects `undefined` field values (no
      // `ignoreUndefinedProperties` configured — see firebaseAdmin.ts), so
      // each optional key is only present at all when there's a real
      // value, never sent as `key: undefined`.
      ...(params.stageId ? { stageId: params.stageId } : {}),
      ...(params.phone ? { phone: params.phone } : {}),
      ...(params.age !== undefined ? { age: params.age } : {}),
    });

    if (params.role === "teacher") {
      await teacherProfileRepository.create({
        teacherId: uid,
        slug: await uniqueTeacherSlug(params.displayName),
        displayName: params.displayName,
        isPublic: false,
        ...(params.subjectId ? { subjectId: params.subjectId } : {}),
        stats: { ...EMPTY_TEACHER_PROFILE_STATS },
        createdAt,
      });
    }

    // TASK-1902 — keep the Admin's system-wide counters in sync with the
    // one place a `users` doc is ever created.
    await systemStatsRepository.incrementStats(
      params.role === "teacher" ? { totalTeachers: 1 } : { totalStudents: 1 },
    );
  } catch (err) {
    // Roll back the Auth-only account so a failed Firestore write doesn't
    // leave an orphaned account nobody can see or recreate.
    await adminAuth.deleteUser(uid).catch(() => {});
    throw err;
  }

  const resetLink = await adminAuth.generatePasswordResetLink(email);

  return { uid, email, displayName: params.displayName, role: params.role, resetLink };
}

export const accountService = {
  /** `POST /api/admin/accounts` — Admin creates a Teacher or Student account. */
  async createAccountByAdmin(session: Session, input: CreateAccountInput): Promise<CreatedAccount> {
    assertRole(session, "admin");
    return provisionAccount({
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      phone: input.phone,
      stageId: input.stageId,
      age: input.age,
      subjectId: input.role === "teacher" ? input.subjectId : undefined,
      createdBy: { uid: session.uid, role: "admin" },
    });
  },

  /**
   * `POST /api/teacher/students` — Teacher creates a Student account of
   * their own. Gated by `Phase 5`'s per-teacher `canCreateStudents` flag
   * (`users/{uid}.canCreateStudents`, Admin-toggleable in the Teachers
   * screen); a missing flag means "not yet restricted" and defaults to
   * allowed, so existing teachers keep working unchanged.
   */
  async createStudentByTeacher(session: Session, input: CreateStudentInput): Promise<CreatedAccount> {
    assertRole(session, "teacher");

    const teacher = await userRepository.findById(session.uid);
    if (!teacher) throw new NotFoundError();
    if (teacher.canCreateStudents === false) throw new ForbiddenError();

    return provisionAccount({
      email: input.email,
      displayName: input.displayName,
      role: "student",
      phone: input.phone,
      age: input.age,
      stageId: input.stageId,
      createdBy: { uid: session.uid, role: "teacher" },
    });
  },
};
