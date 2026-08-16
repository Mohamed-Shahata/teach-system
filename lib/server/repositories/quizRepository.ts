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

/**
 * See `docs/database/collections.md` — `quizzes/{quizId}`. TASK-2101:
 * `courseId` is now optional — absent means a standalone, stage-wide
 * exam, in which case `stageId` + `scheduledAt` are set instead. Never
 * all-absent — enforced by `createQuizSchema`'s cross-field `refine`,
 * not at the repository layer.
 */
export interface QuizDoc {
  id: string;
  teacherId: string;
  courseId?: string;
  lessonId?: string;
  title: LocalizedText;
  status: QuizStatus;
  questionIds: string[];
  /** Required when `courseId` is absent — the education stage this standalone exam targets. */
  stageId?: string;
  /** Required when `courseId` is absent — epoch ms the exam opens for students. */
  scheduledAt?: number;
  /** TASK-2102 — when `false`, `quizAttemptService.submitAttempt` stores answers without scoring them; defaults to `true`. */
  autoGrade: boolean;
  createdAt: number;
  updatedAt: number;
}

export type CreateQuizDoc = Omit<QuizDoc, "id">;
export type UpdateQuizDoc = Partial<
  Pick<QuizDoc, "title" | "lessonId" | "status" | "questionIds" | "stageId" | "scheduledAt" | "autoGrade">
> & { updatedAt: number };

const COLLECTION = "quizzes";

function toQuizDoc(id: string, data: FirebaseFirestore.DocumentData): QuizDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    ...(data.courseId ? { courseId: String(data.courseId) } : {}),
    ...(data.lessonId ? { lessonId: String(data.lessonId) } : {}),
    title: data.title as LocalizedText,
    status: data.status as QuizStatus,
    questionIds: Array.isArray(data.questionIds) ? data.questionIds.map(String) : [],
    ...(data.stageId ? { stageId: String(data.stageId) } : {}),
    ...(data.scheduledAt !== undefined ? { scheduledAt: Number(data.scheduledAt) } : {}),
    // Defaults to `true` for docs written before TASK-2102 (field absent).
    autoGrade: data.autoGrade === undefined ? true : Boolean(data.autoGrade),
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

  /** Every quiz targeting an education stage — standalone exams only (`courseId`-bearing quizzes never set `stageId`); `quizService.listExamsForStudent` (TASK-2104) filters to published + open in JS, same "filter/sort after the query" idiom as `listByCourse`. */
  async listByStage(stageId: string): Promise<QuizDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("stageId", "==", stageId).get();
    return snap.docs.map((doc) => toQuizDoc(doc.id, doc.data()));
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
