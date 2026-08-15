import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { courseRepository, type CourseDoc } from "@/lib/server/repositories/courseRepository";
import { enrollmentRepository, type EnrollmentDoc } from "@/lib/server/repositories/enrollmentRepository";
import { userRepository, type UserDoc } from "@/lib/server/repositories/userRepository";

/**
 * Student service — TASK-1002. There is no `students` collection (see
 * `docs/features/students.md`): a "teacher's students" list is derived by
 * grouping the teacher-scoped enrollments from
 * `enrollmentService.listForTeacher` (TASK-1001) by `studentId`, then
 * joining `users` for name/email.
 *
 * Quiz results are intentionally out of scope — they depend on
 * TASK-1201/1202 (Phase 12, Not Started). The detail view below covers
 * enrolled courses + progress only, per the note left on this task in
 * `docs/tasks/phase-10-student-management.md`.
 */

export interface StudentSummary {
  uid: string;
  displayName: string;
  email: string;
  stageId?: string;
  courseCount: number;
  averageProgress: number;
}

export interface StudentCourseProgress {
  courseId: string;
  courseTitle: CourseDoc["title"] | null;
  status: EnrollmentDoc["status"];
  enrollmentDate: number;
  progress: EnrollmentDoc["progress"];
}

export interface StudentDetail {
  uid: string;
  displayName: string;
  email: string;
  stageId?: string;
  courses: StudentCourseProgress[];
}

function toSummary(uid: string, user: UserDoc | undefined, enrollments: EnrollmentDoc[]): StudentSummary {
  const averageProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, e) => sum + e.progress.percent, 0) / enrollments.length)
    : 0;

  return {
    uid,
    displayName: user?.displayName ?? uid,
    email: user?.email ?? "",
    stageId: user?.stageId,
    courseCount: enrollments.length,
    averageProgress,
  };
}

function groupByStudent(enrollments: EnrollmentDoc[]): Map<string, EnrollmentDoc[]> {
  const groups = new Map<string, EnrollmentDoc[]>();
  for (const enrollment of enrollments) {
    const group = groups.get(enrollment.studentId);
    if (group) {
      group.push(enrollment);
    } else {
      groups.set(enrollment.studentId, [enrollment]);
    }
  }
  return groups;
}

export const studentService = {
  /**
   * A teacher's (or Admin's) students, derived from their enrollments —
   * one row per distinct `studentId`, per `docs/features/students.md`.
   */
  async listStudents(session: Session): Promise<StudentSummary[]> {
    assertRole(session, "teacher", "admin");
    const enrollments = await enrollmentRepository.listByTeacher(session);
    const groups = groupByStudent(enrollments);
    const users = await userRepository.findByIds(Array.from(groups.keys()));

    return Array.from(groups.entries())
      .map(([uid, rows]) => toSummary(uid, users.get(uid), rows))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  /**
   * One student's detail view, scoped to the requesting teacher's own
   * courses — a student enrolled only in another teacher's courses is
   * treated as not found for this teacher, same as any other owner-scoped
   * lookup (never leaks whether the student exists elsewhere).
   */
  async getStudentDetail(session: Session, studentId: string): Promise<StudentDetail> {
    assertRole(session, "teacher", "admin");
    const enrollments = (await enrollmentRepository.listByTeacher(session)).filter(
      (enrollment) => enrollment.studentId === studentId,
    );
    if (enrollments.length === 0) throw new NotFoundError();

    const [user, courses] = await Promise.all([
      userRepository.findById(studentId),
      courseRepository.findByIds(enrollments.map((e) => e.courseId)),
    ]);

    return {
      uid: studentId,
      displayName: user?.displayName ?? studentId,
      email: user?.email ?? "",
      stageId: user?.stageId,
      courses: enrollments
        .map((enrollment) => ({
          courseId: enrollment.courseId,
          courseTitle: courses.get(enrollment.courseId)?.title ?? null,
          status: enrollment.status,
          enrollmentDate: enrollment.enrollmentDate,
          progress: enrollment.progress,
        }))
        .sort((a, b) => b.enrollmentDate - a.enrollmentDate),
    };
  },
};
