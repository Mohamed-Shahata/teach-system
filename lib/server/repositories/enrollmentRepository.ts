import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { scopeToTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { EnrollmentStatus } from "@/lib/validation/enrollment.schema";

/** See `docs/database/collections.md` — `enrollments/{enrollmentId}`. */
export interface EnrollmentDoc {
  id: string;
  studentId: string;
  courseId: string;
  teacherId: string;
  status: EnrollmentStatus;
  enrollmentDate: number;
  progress: {
    completedLessonIds: string[];
    percent: number;
  };
}

export type CreateEnrollmentDoc = Omit<EnrollmentDoc, "id">;

const COLLECTION = "enrollments";

/**
 * Deterministic doc id from the `(studentId, courseId)` unique pair (see
 * collections.md's index note) — using it as the doc id, combined with
 * `.create()` below (fails instead of overwriting), is what actually
 * enforces the uniqueness constraint, the same pattern `userRepository`
 * uses for `users/{uid}`.
 */
function enrollmentId(studentId: string, courseId: string): string {
  return `${studentId}_${courseId}`;
}

function toEnrollmentDoc(id: string, data: FirebaseFirestore.DocumentData): EnrollmentDoc {
  const progress = (data.progress ?? {}) as Partial<EnrollmentDoc["progress"]>;
  return {
    id,
    studentId: String(data.studentId),
    courseId: String(data.courseId),
    teacherId: String(data.teacherId),
    status: data.status as EnrollmentStatus,
    enrollmentDate: Number(data.enrollmentDate),
    progress: {
      completedLessonIds: Array.isArray(progress.completedLessonIds)
        ? progress.completedLessonIds.map(String)
        : [],
      percent: typeof progress.percent === "number" ? progress.percent : 0,
    },
  };
}

export const enrollmentRepository = {
  async findById(id: string): Promise<EnrollmentDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toEnrollmentDoc(snap.id, snap.data() ?? {}) : null;
  },

  async findByStudentAndCourse(studentId: string, courseId: string): Promise<EnrollmentDoc | null> {
    return this.findById(enrollmentId(studentId, courseId));
  },

  /** A student's own enrollments — `(studentId, status)` index. */
  async listByStudent(studentId: string, status?: EnrollmentStatus): Promise<EnrollmentDoc[]> {
    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION).where("studentId", "==", studentId);
    if (status) query = query.where("status", "==", status);
    const snap = await query.get();
    return snap.docs.map((doc) => toEnrollmentDoc(doc.id, doc.data())).sort((a, b) => b.enrollmentDate - a.enrollmentDate);
  },

  /**
   * A teacher's (or, unscoped, an Admin's) enrollments — `(teacherId,
   * courseId)` index, optionally narrowed to one course. This is the
   * query TASK-1001 (teacher-scoped student list) derives from.
   */
  async listByTeacher(session: Session, courseId?: string): Promise<EnrollmentDoc[]> {
    let query = scopeToTeacher(adminDb.collection(COLLECTION), session);
    if (courseId) query = query.where("courseId", "==", courseId);
    const snap = await query.get();
    return snap.docs.map((doc) => toEnrollmentDoc(doc.id, doc.data())).sort((a, b) => b.enrollmentDate - a.enrollmentDate);
  },

  /**
   * Creates the enrollment at the deterministic `(studentId, courseId)`
   * id. Uses `.create()` (fails if it already exists) rather than
   * `.set()` — callers (`enrollmentService.createEnrollment`) catch the
   * "already exists" case to stay idempotent against retried payment
   * webhooks, rather than silently double-processing.
   */
  async create(enrollment: CreateEnrollmentDoc): Promise<EnrollmentDoc> {
    const id = enrollmentId(enrollment.studentId, enrollment.courseId);
    await adminDb.collection(COLLECTION).doc(id).create(enrollment);
    return { id, ...enrollment };
  },

  /**
   * Progress-only update — `studentId`/`courseId`/`teacherId` never
   * change, and `status` is server-derived (recomputed alongside
   * progress by the service layer), never set independently here.
   */
  async updateProgress(
    id: string,
    progress: EnrollmentDoc["progress"],
    status: EnrollmentStatus,
  ): Promise<EnrollmentDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).update({ progress, status });
    return { ...existing, progress, status };
  },
};
