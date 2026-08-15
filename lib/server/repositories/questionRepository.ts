import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { assertWritableByTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { QuestionOptionInput, QuestionType } from "@/lib/validation/quiz.schema";

export interface LocalizedText {
  en: string;
  ar: string;
}

/**
 * See `docs/database/collections.md` — `questions/{questionId}`.
 * `correctOptionIds` lives here, on the full doc — never returned to a
 * student-facing read; `quizService.getQuizForStudent` (TASK-1202) is
 * responsible for stripping it before the response leaves the server,
 * per `docs/features/quizzes.md`.
 */
export interface QuestionDoc {
  id: string;
  teacherId: string;
  quizId: string;
  type: QuestionType;
  prompt: LocalizedText;
  options: QuestionOptionInput[];
  correctOptionIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type CreateQuestionDoc = Omit<QuestionDoc, "id">;
export type UpdateQuestionDoc = Partial<
  Pick<QuestionDoc, "type" | "prompt" | "options" | "correctOptionIds">
> & { updatedAt: number };

/** A question with `correctOptionIds` stripped — what a student ever sees. See `quizService`. */
export type PublicQuestionDoc = Omit<QuestionDoc, "correctOptionIds">;

export function toPublicQuestion(question: QuestionDoc): PublicQuestionDoc {
  const { correctOptionIds: _correctOptionIds, ...rest } = question;
  return rest;
}

const COLLECTION = "questions";

function toQuestionDoc(id: string, data: FirebaseFirestore.DocumentData): QuestionDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    quizId: String(data.quizId),
    type: data.type as QuestionType,
    prompt: data.prompt as LocalizedText,
    options: Array.isArray(data.options) ? (data.options as QuestionOptionInput[]) : [],
    correctOptionIds: Array.isArray(data.correctOptionIds) ? data.correctOptionIds.map(String) : [],
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const questionRepository = {
  async listByQuiz(quizId: string): Promise<QuestionDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("quizId", "==", quizId).get();
    return snap.docs.map((doc) => toQuestionDoc(doc.id, doc.data()));
  },

  /** Batch lookup preserving no particular order — callers reorder via `quiz.questionIds` (same pattern as `courseRepository.findByIds`). */
  async findByIds(ids: string[]): Promise<QuestionDoc[]> {
    if (ids.length === 0) return [];
    const refs = ids.map((id) => adminDb.collection(COLLECTION).doc(id));
    const snaps = await adminDb.getAll(...refs);
    return snaps.filter((snap) => snap.exists).map((snap) => toQuestionDoc(snap.id, snap.data() ?? {}));
  },

  async findById(id: string): Promise<QuestionDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toQuestionDoc(snap.id, snap.data() ?? {}) : null;
  },

  async create(question: CreateQuestionDoc): Promise<QuestionDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(question);
    return { id: ref.id, ...question };
  },

  async update(session: Session, id: string, patch: UpdateQuestionDoc): Promise<QuestionDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },

  async delete(session: Session, id: string): Promise<QuestionDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).delete();
    return existing;
  },
};
