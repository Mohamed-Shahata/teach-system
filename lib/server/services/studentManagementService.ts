import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { userRepository, type UserDoc } from "@/lib/server/repositories/userRepository";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { educationStageRepository, type LocalizedText } from "@/lib/server/repositories/educationStageRepository";

/**
 * TASK-1904 — Admin-facing Student management (list, view, deactivate).
 *
 * Center-wide, unlike a teacher's own student list (TASK-1002, scoped to
 * that teacher's enrollments): lists every `users` doc with
 * `role: "student"` across all teachers, per `features/admin-dashboard.md`.
 *
 * Students have no `studentProfiles` doc with pre-aggregated stats the
 * way teachers do (`teacherProfiles.stats`) — see `database/collections.md`,
 * there's no such collection — so enrollment counts here are derived
 * on-the-fly from `enrollments` via `enrollmentRepository.listByStudent`
 * rather than read off a denormalized counter. Stage name is resolved
 * from `educationStages` the same way `CenterConfigManager` (TASK-1905)
 * reads it, since `users.stageId` is just a ref.
 *
 * "Deactivate" mirrors TASK-1903 exactly: disables the Firebase Auth
 * account so the next `verifySessionCookie` (`checkRevoked: true`)
 * rejects them, without touching any of their data.
 */

export interface StudentStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
}

export const EMPTY_STUDENT_STATS: StudentStats = {
  totalEnrollments: 0,
  activeEnrollments: 0,
  completedEnrollments: 0,
};

export interface StudentSummary {
  uid: string;
  displayName: string;
  email: string;
  disabled: boolean;
  stageId?: string;
  stageName?: LocalizedText;
  stats: StudentStats;
}

export interface StudentDetail extends StudentSummary {
  createdAt: number;
}

async function computeStats(studentId: string): Promise<StudentStats> {
  const enrollments = await enrollmentRepository.listByStudent(studentId);
  return {
    totalEnrollments: enrollments.length,
    activeEnrollments: enrollments.filter((e) => e.status === "active").length,
    completedEnrollments: enrollments.filter((e) => e.status === "completed").length,
  };
}

function toSummary(
  user: UserDoc,
  stats: StudentStats,
  stageNames: Map<string, LocalizedText>,
): StudentSummary {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    disabled: Boolean(user.disabled),
    stageId: user.stageId,
    stageName: user.stageId ? stageNames.get(user.stageId) : undefined,
    stats,
  };
}

async function stageNameMap(): Promise<Map<string, LocalizedText>> {
  const stages = await educationStageRepository.list();
  return new Map(stages.map((stage) => [stage.id, stage.name]));
}

export const studentManagementService = {
  async listStudents(session: Session, search?: string): Promise<StudentSummary[]> {
    assertRole(session, "admin");
    const students = await userRepository.listByRole("student", search);
    const [stats, stageNames] = await Promise.all([
      Promise.all(students.map((student) => computeStats(student.uid))),
      stageNameMap(),
    ]);
    return students.map((student, index) => toSummary(student, stats[index] ?? EMPTY_STUDENT_STATS, stageNames));
  },

  async getStudentDetail(session: Session, studentId: string): Promise<StudentDetail> {
    assertRole(session, "admin");
    const user = await userRepository.findById(studentId);
    if (!user || user.role !== "student") {
      throw new NotFoundError();
    }
    const [stats, stageNames] = await Promise.all([computeStats(studentId), stageNameMap()]);
    return { ...toSummary(user, stats, stageNames), createdAt: user.createdAt };
  },

  /** `disabled: true` deactivates the account; `false` reactivates it. */
  async setStudentDisabled(session: Session, studentId: string, disabled: boolean): Promise<StudentSummary> {
    assertRole(session, "admin");
    const user = await userRepository.findById(studentId);
    if (!user || user.role !== "student") {
      throw new NotFoundError();
    }
    await adminAuth.updateUser(studentId, { disabled });
    await userRepository.setDisabled(studentId, disabled);
    const [stats, stageNames] = await Promise.all([computeStats(studentId), stageNameMap()]);
    return toSummary({ ...user, disabled }, stats, stageNames);
  },
};
