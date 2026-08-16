import "server-only";
import { assertCanViewEnrollment, assertRole, assertStudentEnrolled } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { courseRepository } from "@/lib/server/repositories/courseRepository";
import { enrollmentRepository, type EnrollmentDoc } from "@/lib/server/repositories/enrollmentRepository";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { systemStatsRepository } from "@/lib/server/repositories/systemStatsRepository";
import type { EnrollmentStatus } from "@/lib/validation/enrollment.schema";

/**
 * Enrollment service — TASK-1101. An enrollment is only ever created
 * server-side as a side effect of a payment reaching `succeeded`/
 * `confirmed` (`createEnrollment`, called from `paymentService` — wires up
 * the two `TODO(TASK-1101)` spots left there by TASK-1104); there is no
 * client-facing "create enrollment" endpoint.
 */

/** Firestore's grpc ALREADY_EXISTS status code, thrown by `.create()` on an existing doc. */
function isAlreadyExists(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === 6;
}

function computeProgress(completedLessonIds: string[], totalLessons: number): EnrollmentDoc["progress"] {
  const percent = totalLessons > 0 ? Math.min(100, Math.round((completedLessonIds.length / totalLessons) * 100)) : 0;
  return { completedLessonIds, percent };
}

export const enrollmentService = {
  /**
   * Creates the enrollment for a settled payment, or returns the existing
   * one unchanged if it's already there — idempotent against a retried
   * gateway webhook or a double manual-confirm click, per
   * `paymentService`'s `TODO(TASK-1101)` call sites, rather than throwing
   * a `ConflictError` a caller would have to specially handle.
   */
  async createEnrollment(params: { studentId: string; courseId: string; teacherId: string }): Promise<EnrollmentDoc> {
    const existing = await enrollmentRepository.findByStudentAndCourse(params.studentId, params.courseId);
    if (existing) return existing;

    try {
      const enrollment = await enrollmentRepository.create({
        studentId: params.studentId,
        courseId: params.courseId,
        teacherId: params.teacherId,
        status: "active",
        enrollmentDate: Date.now(),
        progress: { completedLessonIds: [], percent: 0 },
      });
      await teacherProfileRepository.incrementStats(params.teacherId, { totalEnrollments: 1 });
      await systemStatsRepository.incrementStats({ totalEnrollments: 1 });
      return enrollment;
    } catch (err) {
      // Lost a race with a concurrent create for the same pair (e.g. a
      // webhook retry that overlapped the first attempt) — fetch and
      // return what's there instead of surfacing a spurious conflict.
      if (isAlreadyExists(err)) {
        const raced = await enrollmentRepository.findByStudentAndCourse(params.studentId, params.courseId);
        if (raced) return raced;
      }
      throw err;
    }
  },

  /** A student's own enrollments. */
  async listMyEnrollments(session: Session, status?: EnrollmentStatus) {
    assertRole(session, "student");
    return enrollmentRepository.listByStudent(session.uid, status);
  },

  /** A teacher's (or Admin's) enrollments — this is TASK-1001's teacher-scoped student query. */
  async listForTeacher(session: Session, courseId?: string) {
    assertRole(session, "teacher", "admin");
    return enrollmentRepository.listByTeacher(session, courseId);
  },

  async getEnrollment(session: Session, id: string) {
    const enrollment = await enrollmentRepository.findById(id);
    if (!enrollment) throw new NotFoundError();
    assertCanViewEnrollment(session, enrollment);
    return enrollment;
  },

  /** Marks one lesson complete for the enrolled student and recomputes `progress.percent`. */
  async markLessonComplete(session: Session, enrollmentId: string, lessonId: string) {
    assertRole(session, "student");
    const enrollment = await enrollmentRepository.findById(enrollmentId);
    if (!enrollment) throw new NotFoundError();
    assertStudentEnrolled(session, enrollment);

    const course = await courseRepository.findById(enrollment.courseId);
    const totalLessons = course?.lessonOrder.length ?? 0;

    const completedLessonIds = enrollment.progress.completedLessonIds.includes(lessonId)
      ? enrollment.progress.completedLessonIds
      : [...enrollment.progress.completedLessonIds, lessonId];

    const progress = computeProgress(completedLessonIds, totalLessons);
    const status: EnrollmentStatus = progress.percent >= 100 ? "completed" : enrollment.status;

    return enrollmentRepository.updateProgress(enrollmentId, progress, status);
  },
};
