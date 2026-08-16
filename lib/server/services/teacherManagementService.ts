import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { userRepository, type UserDoc } from "@/lib/server/repositories/userRepository";
import {
  EMPTY_TEACHER_PROFILE_STATS,
  teacherProfileRepository,
  type TeacherProfileStats,
} from "@/lib/server/repositories/teacherProfileRepository";

/**
 * TASK-1903 — Admin-facing Teacher management (list, view, deactivate).
 *
 * Center-wide, unlike a teacher's own dashboard: lists every `users` doc
 * with `role: "teacher"`, joined to `teacherProfiles.stats` for the
 * courses/students/enrollment counts `features/admin-dashboard.md` asks
 * for — the same denormalized counters `teacher/dashboard/page.tsx`
 * (TASK-702) already reads, just surfaced per-teacher instead of for the
 * logged-in teacher only.
 *
 * "Deactivate" disables the Firebase Auth account
 * (`adminAuth.updateUser(uid, { disabled: true })`) so the person can no
 * longer log in — `lib/auth/session.ts` already verifies session cookies
 * with `checkRevoked: true`, so a disabled account is rejected on its
 * very next request without any extra work here. It does not delete any
 * data, per `features/admin-dashboard.md`.
 */

export interface TeacherSummary {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  disabled: boolean;
  /** Phase 5 — whether this teacher may create their own students (`users.canCreateStudents`, default `true`). */
  canCreateStudents: boolean;
  /** refs into `subjects`, mirrored from `teacherProfiles.subjectIds` — the "Edit" dialog's subjects field (TASK-2402). */
  subjectIds?: string[];
  stats: TeacherProfileStats;
}

export interface TeacherDetail extends TeacherSummary {
  createdAt: number;
}

function toSummary(user: UserDoc, stats: TeacherProfileStats, subjectIds?: string[]): TeacherSummary {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    disabled: Boolean(user.disabled),
    canCreateStudents: user.canCreateStudents !== false,
    subjectIds,
    stats,
  };
}

export const teacherManagementService = {
  async listTeachers(session: Session, search?: string): Promise<TeacherSummary[]> {
    assertRole(session, "admin");
    const teachers = await userRepository.listByRole("teacher", search);
    const stats = await Promise.all(
      teachers.map((teacher) => teacherProfileRepository.findStatsByTeacherId(teacher.uid)),
    );
    return teachers.map((teacher, index) => toSummary(teacher, stats[index] ?? EMPTY_TEACHER_PROFILE_STATS));
  },

  async getTeacherDetail(session: Session, teacherId: string): Promise<TeacherDetail> {
    assertRole(session, "admin");
    const user = await userRepository.findById(teacherId);
    if (!user || user.role !== "teacher") {
      throw new NotFoundError();
    }
    const stats = await teacherProfileRepository.findStatsByTeacherId(teacherId);
    return {
      ...toSummary(user, stats ?? EMPTY_TEACHER_PROFILE_STATS),
      createdAt: user.createdAt,
    };
  },

  /**
   * Admin edit of a teacher's profile fields — the Teacher management
   * "Edit" action. `displayName`/`email` also update the Firebase Auth
   * account (same dual-write `setTeacherDisabled` uses); `displayName`/
   * `subjectIds` are mirrored onto `teacherProfiles` since that's what the
   * public teacher page and offerings dialog read.
   */
  async updateTeacherProfile(
    session: Session,
    teacherId: string,
    input: { displayName?: string; email?: string; phone?: string; subjectIds?: string[] },
  ): Promise<TeacherSummary> {
    assertRole(session, "admin");
    const user = await userRepository.findById(teacherId);
    if (!user || user.role !== "teacher") {
      throw new NotFoundError();
    }

    const authUpdate: { displayName?: string; email?: string } = {};
    if (input.displayName) authUpdate.displayName = input.displayName;
    if (input.email) authUpdate.email = input.email;
    if (Object.keys(authUpdate).length > 0) {
      await adminAuth.updateUser(teacherId, authUpdate);
    }
    await userRepository.updateProfile(teacherId, {
      displayName: input.displayName,
      email: input.email,
      phone: input.phone,
    });
    await teacherProfileRepository.updateProfileFields(teacherId, {
      displayName: input.displayName,
      subjectIds: input.subjectIds,
    });

    const stats = await teacherProfileRepository.findStatsByTeacherId(teacherId);
    return toSummary({ ...user, ...input }, stats ?? EMPTY_TEACHER_PROFILE_STATS, input.subjectIds);
  },

  /** `disabled: true` deactivates the account; `false` reactivates it. */
  async setTeacherDisabled(session: Session, teacherId: string, disabled: boolean): Promise<TeacherSummary> {
    assertRole(session, "admin");
    const user = await userRepository.findById(teacherId);
    if (!user || user.role !== "teacher") {
      throw new NotFoundError();
    }
    await adminAuth.updateUser(teacherId, { disabled });
    await userRepository.setDisabled(teacherId, disabled);
    const stats = await teacherProfileRepository.findStatsByTeacherId(teacherId);
    return toSummary({ ...user, disabled }, stats ?? EMPTY_TEACHER_PROFILE_STATS);
  },

  /**
   * Phase 5 — toggles whether this teacher can create their own student
   * accounts (`accountService.createStudentByTeacher` checks this flag).
   * Firestore-only, unlike `setTeacherDisabled` — it doesn't touch the
   * Firebase Auth account at all, since it isn't a login/access gate.
   */
  async setTeacherPermissions(
    session: Session,
    teacherId: string,
    canCreateStudents: boolean,
  ): Promise<TeacherSummary> {
    assertRole(session, "admin");
    const user = await userRepository.findById(teacherId);
    if (!user || user.role !== "teacher") {
      throw new NotFoundError();
    }
    await userRepository.setCanCreateStudents(teacherId, canCreateStudents);
    const stats = await teacherProfileRepository.findStatsByTeacherId(teacherId);
    return toSummary({ ...user, canCreateStudents }, stats ?? EMPTY_TEACHER_PROFILE_STATS);
  },
};
