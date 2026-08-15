import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { assertWritableByTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { LessonVideoInput } from "@/lib/validation/lesson.schema";

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface LessonDoc {
  id: string;
  teacherId: string;
  courseId: string;
  title: LocalizedText;
  description?: Partial<LocalizedText>;
  order: number;
  video?: LessonVideoInput;
  fileIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type CreateLessonDoc = Omit<LessonDoc, "id">;
export type UpdateLessonDoc = Partial<
  Pick<LessonDoc, "title" | "description" | "order" | "video" | "fileIds">
> & { updatedAt: number };

const COLLECTION = "lessons";

function toLessonDoc(id: string, data: FirebaseFirestore.DocumentData): LessonDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    courseId: String(data.courseId),
    title: data.title as LocalizedText,
    ...(data.description ? { description: data.description as Partial<LocalizedText> } : {}),
    order: Number(data.order),
    ...(data.video ? { video: data.video as LessonVideoInput } : {}),
    fileIds: Array.isArray(data.fileIds) ? data.fileIds.map(String) : [],
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const lessonRepository = {
  /** Ordered by position within the course — `(courseId, order)` index. */
  async listByCourse(courseId: string): Promise<LessonDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("courseId", "==", courseId).get();
    return snap.docs.map((doc) => toLessonDoc(doc.id, doc.data())).sort((a, b) => a.order - b.order);
  },

  async findById(id: string): Promise<LessonDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toLessonDoc(snap.id, snap.data() ?? {}) : null;
  },

  async create(lesson: CreateLessonDoc): Promise<LessonDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(lesson);
    return { id: ref.id, ...lesson };
  },

  async update(session: Session, id: string, patch: UpdateLessonDoc): Promise<LessonDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },

  async delete(session: Session, id: string): Promise<LessonDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).delete();
    return existing;
  },

  /**
   * Rewrites `order` (0-based, by position in `orderedLessonIds`) for
   * every lesson in one batch — the single-collection half of a
   * reorder; the caller (`lessonService.reorderLessons`) is responsible
   * for also updating `courses/{courseId}.lessonOrder` via
   * `courseRepository`, since cross-collection orchestration belongs at
   * the service layer, not here (`architecture/overview.md` layering
   * rules).
   */
  async reorder(orderedLessonIds: string[], updatedAt: number): Promise<void> {
    const batch = adminDb.batch();
    orderedLessonIds.forEach((lessonId, index) => {
      batch.update(adminDb.collection(COLLECTION).doc(lessonId), { order: index, updatedAt });
    });
    await batch.commit();
  },
};
