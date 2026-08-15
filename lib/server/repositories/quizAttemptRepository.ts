import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";

/** See `docs/database/collections.md` — `quizAttempts/{attemptId}`. */
export interface QuizAttemptAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface QuizAttemptDoc {
  id: string;
  studentId: string;
  quizId: string;
  teacherId: string;
  answers: QuizAttemptAnswer[];
  score: number;
  submittedAt: number;
}

export type CreateQuizAttemptDoc = Omit<QuizAttemptDoc, "id">;

const COLLECTION = "quizAttempts";

function toQuizAttemptDoc(id: string, data: FirebaseFirestore.DocumentData): QuizAttemptDoc {
  return {
    id,
    studentId: String(data.studentId),
    quizId: String(data.quizId),
    teacherId: String(data.teacherId),
    answers: Array.isArray(data.answers) ? (data.answers as QuizAttemptAnswer[]) : [],
    score: Number(data.score),
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
};
