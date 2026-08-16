import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";

/** See `docs/database/collections.md` — `lessonProgress/{studentId}_{lessonId}`. */
export interface LessonProgressDoc {
  id: string;
  studentId: string;
  lessonId: string;
  watchedSeconds: number;
  videoDurationSeconds: number;
  lastPositionSeconds: number;
  updatedAt: number;
}

export type UpsertLessonProgressDoc = Omit<LessonProgressDoc, "id">;

const COLLECTION = "lessonProgress";

/** Deterministic doc id — same composite-key pattern as `enrollments/{studentId}_{courseId}`. */
function progressId(studentId: string, lessonId: string): string {
  return `${studentId}_${lessonId}`;
}

function toLessonProgressDoc(id: string, data: FirebaseFirestore.DocumentData): LessonProgressDoc {
  return {
    id,
    studentId: String(data.studentId),
    lessonId: String(data.lessonId),
    watchedSeconds: Number(data.watchedSeconds),
    videoDurationSeconds: Number(data.videoDurationSeconds),
    lastPositionSeconds: Number(data.lastPositionSeconds),
    updatedAt: Number(data.updatedAt),
  };
}

export const lessonProgressRepository = {
  async findByStudentAndLesson(studentId: string, lessonId: string): Promise<LessonProgressDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(progressId(studentId, lessonId)).get();
    return snap.exists ? toLessonProgressDoc(snap.id, snap.data() ?? {}) : null;
  },

  /**
   * Batch lookup of one student's progress across several lessons (the
   * course-progress roll-up in `enrollmentService`) — `getAll` on the
   * deterministic ids, same pattern as `questionRepository.findByIds`,
   * rather than a `where(\"lessonId\", \"in\", ...)` query (which would
   * also cap out at Firestore's 30-value `in` limit for a large course).
   * Missing docs (lesson never watched) are simply absent from the
   * result — callers treat a missing lessonId as 0% watched.
   */
  async listByStudentForLessons(studentId: string, lessonIds: string[]): Promise<LessonProgressDoc[]> {
    if (lessonIds.length === 0) return [];
    const refs = lessonIds.map((lessonId) => adminDb.collection(COLLECTION).doc(progressId(studentId, lessonId)));
    const snaps = await adminDb.getAll(...refs);
    return snaps.filter((snap) => snap.exists).map((snap) => toLessonProgressDoc(snap.id, snap.data() ?? {}));
  },

  /**
   * Creates or overwrites the student's progress doc for one lesson.
   * Uses `.set()` (not `.create()`) — unlike `enrollments`, repeated
   * writes to the same id are the expected steady state here (every
   * throttled player report), not a race to guard against.
   */
  async upsert(progress: UpsertLessonProgressDoc): Promise<LessonProgressDoc> {
    const id = progressId(progress.studentId, progress.lessonId);
    await adminDb.collection(COLLECTION).doc(id).set(progress);
    return { id, ...progress };
  },
};
