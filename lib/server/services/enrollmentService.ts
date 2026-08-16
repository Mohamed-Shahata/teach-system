import "server-only";
import { assertCanViewEnrollment, assertRole, assertStudentEnrolled } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { courseRepository } from "@/lib/server/repositories/courseRepository";
import { enrollmentRepository, type EnrollmentDoc } from "@/lib/server/repositories/enrollmentRepository";
import { lessonProgressRepository } from "@/lib/server/repositories/lessonProgressRepository";
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

/**
 * One lesson's watch percentage from its `lessonProgress` doc
 * (TASK-2503) — `0` if the lesson has no video, no duration recorded
 * yet, or was never watched at all (no doc). Exported so TASK-2504's
 * teacher-facing per-student/per-lesson view (`studentService
 * .getCourseStudentsProgress`) can reuse the exact same rule instead of
 * re-deriving it, per `development/coding-rules.md`'s "No Duplicate
 * Functionality".
 */
export function watchPercent(videoDurationSeconds: number, watchedSeconds: number): number {
  if (videoDurationSeconds <= 0) return 0;
  return Math.min(100, Math.round((watchedSeconds / videoDurationSeconds) * 100));
}

/**
 * `enrollment.progress` roll-up (TASK-2503) — per lesson in the course,
 * a manually-completed lesson (`completedLessonIds`, TASK-1101's
 * existing signal) always counts as 100%; every other lesson counts at
 * its watch percentage from `lessonProgress` (0% if never watched).
 * `progress.percent` is the average across all lessons in the course,
 * so "mark as completed" remains a real override a student can still
 * trigger regardless of watch time, per this phase's own note in
 * `docs/tasks/phase-25-watch-progress-tracking.md`.
 */
async function computeProgress(
  courseId: string,
  studentId: string,
  completedLessonIds: string[],
): Promise<EnrollmentDoc["progress"]> {
  const course = await courseRepository.findById(courseId);
  const lessonIds = course?.lessonOrder ?? [];
  const totalLessons = lessonIds.length;
  if (totalLessons === 0) return { completedLessonIds, percent: 0 };

  const watchDocs = await lessonProgressRepository.listByStudentForLessons(studentId, lessonIds);
  const watchByLessonId = new Map(watchDocs.map((doc) => [doc.lessonId, doc]));

  const totalPercent = lessonIds.reduce((sum, lessonId) => {
    if (completedLessonIds.includes(lessonId)) return sum + 100;
    const doc = watchByLessonId.get(lessonId);
    return sum + (doc ? watchPercent(doc.videoDurationSeconds, doc.watchedSeconds) : 0);
  }, 0);

  const percent = Math.min(100, Math.round(totalPercent / totalLessons));
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

    const completedLessonIds = enrollment.progress.completedLessonIds.includes(lessonId)
      ? enrollment.progress.completedLessonIds
      : [...enrollment.progress.completedLessonIds, lessonId];

    const progress = await computeProgress(enrollment.courseId, session.uid, completedLessonIds);
    const status: EnrollmentStatus = progress.percent >= 100 ? "completed" : enrollment.status;

    return enrollmentRepository.updateProgress(enrollmentId, progress, status);
  },

  /**
   * Re-rolls `progress.percent` from current watch data, keeping
   * `completedLessonIds` as-is — called by `lessonProgressService
   * .reportProgress` (TASK-2503) after each throttled watch-time
   * report, so `enrollment.progress` stays live without the student
   * needing to hit "mark complete". Returns `null` rather than
   * throwing when no enrollment exists for the pair — the caller
   * (`lessonProgressService`) has already gated the report on
   * `assertStudentEnrolled`, so this is only a defensive no-op path
   * (e.g. a cancelled enrollment), not an error condition to surface.
   */
  async recalculateWatchProgress(studentId: string, courseId: string): Promise<EnrollmentDoc | null> {
    const enrollment = await enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    if (!enrollment) return null;

    const progress = await computeProgress(courseId, studentId, enrollment.progress.completedLessonIds);
    const status: EnrollmentStatus = progress.percent >= 100 ? "completed" : enrollment.status;

    return enrollmentRepository.updateProgress(enrollment.id, progress, status);
  },
};
