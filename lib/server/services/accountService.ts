import "server-only";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { userRepository } from "@/lib/server/repositories/userRepository";
import {
  EMPTY_TEACHER_PROFILE_STATS,
  teacherProfileRepository,
} from "@/lib/server/repositories/teacherProfileRepository";
import { assertRole } from "@/lib/auth/guards";
import { ConflictError } from "@/lib/errors";
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
  email: string;
  displayName: string;
  role: "teacher" | "student";
  stageId?: string;
  createdBy: { uid: string; role: "admin" | "teacher" };
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

async function provisionAccount(params: ProvisionAccountParams): Promise<CreatedAccount> {
  let uid: string;
  try {
    const authUser = await adminAuth.createUser({
      email: params.email,
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
      email: params.email,
      displayName: params.displayName,
      role: params.role,
      createdBy: params.createdBy,
      createdAt,
      // Firestore Admin SDK rejects `undefined` field values (no
      // `ignoreUndefinedProperties` configured — see firebaseAdmin.ts), so
      // the key is only present at all when there's a real stageId
      // (students), never sent as `stageId: undefined` for teachers.
      ...(params.stageId ? { stageId: params.stageId } : {}),
    });

    if (params.role === "teacher") {
      await teacherProfileRepository.create({
        teacherId: uid,
        displayName: params.displayName,
        isPublic: false,
        stats: { ...EMPTY_TEACHER_PROFILE_STATS },
        createdAt,
      });
    }
  } catch (err) {
    // Roll back the Auth-only account so a failed Firestore write doesn't
    // leave an orphaned account nobody can see or recreate.
    await adminAuth.deleteUser(uid).catch(() => {});
    throw err;
  }

  const resetLink = await adminAuth.generatePasswordResetLink(params.email);

  return { uid, email: params.email, displayName: params.displayName, role: params.role, resetLink };
}

export const accountService = {
  /** `POST /api/admin/accounts` — Admin creates a Teacher or Student account. */
  async createAccountByAdmin(session: Session, input: CreateAccountInput): Promise<CreatedAccount> {
    assertRole(session, "admin");
    return provisionAccount({
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      stageId: input.stageId,
      createdBy: { uid: session.uid, role: "admin" },
    });
  },

  /** `POST /api/teacher/students` — Teacher creates a Student account of their own. */
  async createStudentByTeacher(session: Session, input: CreateStudentInput): Promise<CreatedAccount> {
    assertRole(session, "teacher");
    return provisionAccount({
      email: input.email,
      displayName: input.displayName,
      role: "student",
      stageId: input.stageId,
      createdBy: { uid: session.uid, role: "teacher" },
    });
  },
};
