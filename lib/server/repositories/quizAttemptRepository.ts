import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { NotFoundError } from "@/lib/errors";

/** See `docs/database/collections.md` — `quizAttempts/{attemptId}`. */
export interface QuizAttemptAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

/** TASK-2102 — `pending_review` for manually-graded quizzes until a teacher scores them; `graded` otherwise (including immediately for auto-graded quizzes). */
export type QuizAttemptStatus = "graded" | "pending_review";

export interface QuizAttemptDoc {
  id: string;
  studentId: string;
  quizId: string;
  teacherId: string;
  answers: QuizAttemptAnswer[];
  /** Server-computed for auto-graded quizzes; `0` placeholder while `status === "pending_review"` — never shown to the student as a real score (see `quizAttemptService`/the results UI). */
  score: number;
  status: QuizAttemptStatus;
  /** Set once a teacher grades a `pending_review` attempt (TASK-2103). */
  gradedBy?: string;
  gradedAt?: number;
  submittedAt: number;
}

export type CreateQuizAttemptDoc = Omit<QuizAttemptDoc, "id">;
export type UpdateQuizAttemptDoc = Partial<Pick<QuizAttemptDoc, "score" | "status" | "gradedBy" | "gradedAt">>;

const COLLECTION = "quizAttempts";

function toQuizAttemptDoc(id: string, data: FirebaseFirestore.DocumentData): QuizAttemptDoc {
  return {
    id,
    studentId: String(data.studentId),
    quizId: String(data.quizId),
    teacherId: String(data.teacherId),
    answers: Array.isArray(data.answers) ? (data.answers as QuizAttemptAnswer[]) : [],
    score: Number(data.score),
    // Defaults to "graded" for attempts written before TASK-2102 (field absent) — they were always auto-graded.
    status: (data.status as QuizAttemptStatus | undefined) ?? "graded",
    ...(data.gradedBy ? { gradedBy: String(data.gradedBy) } : {}),
    ...(data.gradedAt !== undefined ? { gradedAt: Number(data.gradedAt) } : {}),
    submittedAt: Number(data.submittedAt),
  };
}

export const quizAttemptRepository = {
  async findById(id: string): Promise<QuizAttemptDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toQuizAttemptDoc(snap.id, snap.data() ?? {}) : null;
  },

  /** A student's own attempts at one quiz — a student may retake a quiz, so this can be more than one doc (`(studentId, quizId)` index), unlike enrollment's one-per-pair. */
  async listByStudentAndQuiz(studentId: string, quizId: string): Promise<QuizAttemptDoc[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("studentId", "==", studentId)
      .where("quizId", "==", quizId)
      .get();
    return snap.docs
      .map((doc) => toQuizAttemptDoc(doc.id, doc.data()))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  },

  /** Owning teacher's (or Admin's) view of every attempt at one quiz — `(quizId)` index, teacher isolation enforced by `quizService` already having verified quiz ownership before calling this. */
  async listByQuiz(quizId: string): Promise<QuizAttemptDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("quizId", "==", quizId).get();
    return snap.docs
      .map((doc) => toQuizAttemptDoc(doc.id, doc.data()))
      .sort((a, b) => b.submittedAt - a.submittedAt);
  },

  async create(attempt: CreateQuizAttemptDoc): Promise<QuizAttemptDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(attempt);
    return { id: ref.id, ...attempt };
  },

  /** TASK-2103 — flips a `pending_review` attempt to `graded` with a teacher-set score. No ownership check here — `quizAttemptService` verifies quiz ownership before calling, same layering as `quizRepository.update`. */
  async update(id: string, patch: UpdateQuizAttemptDoc): Promise<QuizAttemptDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },
};
