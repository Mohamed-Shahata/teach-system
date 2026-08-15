import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { assertWritableByTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { QuizStatus } from "@/lib/validation/quiz.schema";

export interface LocalizedText {
  en: string;
  ar: string;
}

/** See `docs/database/collections.md` — `quizzes/{quizId}`. */
export interface QuizDoc {
  id: string;
  teacherId: string;
  courseId: string;
  lessonId?: string;
  title: LocalizedText;
  status: QuizStatus;
  questionIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type CreateQuizDoc = Omit<QuizDoc, "id">;
export type UpdateQuizDoc = Partial<
  Pick<QuizDoc, "title" | "lessonId" | "status" | "questionIds">
> & { updatedAt: number };

const COLLECTION = "quizzes";

function toQuizDoc(id: string, data: FirebaseFirestore.DocumentData): QuizDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    courseId: String(data.courseId),
    ...(data.lessonId ? { lessonId: String(data.lessonId) } : {}),
    title: data.title as LocalizedText,
    status: data.status as QuizStatus,
    questionIds: Array.isArray(data.questionIds) ? data.questionIds.map(String) : [],
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const quizRepository = {
  /** All quizzes for a course — teacher's own list (builder) and student's published-only filter, per `quizService`. */
  async listByCourse(courseId: string): Promise<QuizDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("courseId", "==", courseId).get();
    return snap.docs.map((doc) => toQuizDoc(doc.id, doc.data())).sort((a, b) => a.createdAt - b.createdAt);
  },

  async findById(id: string): Promise<QuizDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toQuizDoc(snap.id, snap.data() ?? {}) : null;
  },

  async create(quiz: CreateQuizDoc): Promise<QuizDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(quiz);
    return { id: ref.id, ...quiz };
  },

  async update(session: Session, id: string, patch: UpdateQuizDoc): Promise<QuizDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },

  async delete(session: Session, id: string): Promise<QuizDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).delete();
    return existing;
  },
};
