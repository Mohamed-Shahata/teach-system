import "server-only";
import { assertRole, assertStudentEnrolled, assertTeacherOwnsResource } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { questionRepository, type QuestionDoc } from "@/lib/server/repositories/questionRepository";
import { quizAttemptRepository, type QuizAttemptDoc } from "@/lib/server/repositories/quizAttemptRepository";
import { quizRepository } from "@/lib/server/repositories/quizRepository";
import type { SubmitQuizAttemptInput } from "@/lib/validation/quiz.schema";

/**
 * Quiz attempt submission & grading — TASK-1202. Scores a submission
 * server-side against the stored `correctOptionIds` (never trusting a
 * client-submitted score, per `features/quizzes.md`) and writes
 * `quizAttempts`. Layered on top of `quizService` (TASK-1201) rather
 * than folded into it, since `quizAttempts` is its own collection with
 * its own access rules (a student's *history* of attempts, not a
 * teacher-owned CRUD resource).
 */

/** A question is correct only if the submitted set exactly matches the stored correct set — partial credit isn't part of the MVP grading model in `features/quizzes.md`. */
function isAnswerCorrect(question: QuestionDoc, selectedOptionIds: string[]): boolean {
  const correct = new Set(question.correctOptionIds);
  const selected = new Set(selectedOptionIds);
  return correct.size === selected.size && [...correct].every((id) => selected.has(id));
}

function computeScore(questions: QuestionDoc[], answers: SubmitQuizAttemptInput["answers"]): number {
  if (questions.length === 0) return 0;
  const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.selectedOptionIds]));
  const correctCount = questions.reduce((count, question) => {
    const selected = answerByQuestionId.get(question.id) ?? [];
    return isAnswerCorrect(question, selected) ? count + 1 : count;
  }, 0);
  return Math.round((correctCount / questions.length) * 100);
}

export const quizAttemptService = {
  /**
   * Student submits answers to a published quiz they're enrolled in.
   * Grading only ever considers the quiz's own `questionIds` — any
   * `answers` entry for a question outside that set is ignored, so a
   * client can't inflate/deflate its score by submitting extra or
   * mismatched question ids.
   */
  async submitAttempt(session: Session, quizId: string, input: SubmitQuizAttemptInput): Promise<QuizAttemptDoc> {
    assertRole(session, "student");

    const quiz = await quizRepository.findById(quizId);
    if (!quiz || quiz.status !== "published") {
      throw new NotFoundError();
    }
    if (quiz.questionIds.length === 0) {
      throw new ValidationError();
    }

    const enrollment = await enrollmentRepository.findByStudentAndCourse(session.uid, quiz.courseId);
    assertStudentEnrolled(session, enrollment);

    const questions = await questionRepository.findByIds(quiz.questionIds);

    const attempt = await quizAttemptRepository.create({
      studentId: session.uid,
      quizId: quiz.id,
      teacherId: quiz.teacherId,
      answers: input.answers,
      score: computeScore(questions, input.answers),
      submittedAt: Date.now(),
    });

    return attempt;
  },

  /** The signed-in student's own attempts at one quiz, most recent first — a student may retake, so this can be more than one. */
  async listMyAttempts(session: Session, quizId: string): Promise<QuizAttemptDoc[]> {
    assertRole(session, "student");
    return quizAttemptRepository.listByStudentAndQuiz(session.uid, quizId);
  },

  /** Owning teacher (or Admin) view of every attempt at one quiz — verifies quiz ownership first via `assertTeacherOwnsResource`, same as `quizService`. */
  async listAttemptsForQuiz(session: Session, quizId: string): Promise<QuizAttemptDoc[]> {
    assertRole(session, "teacher", "admin");
    const quiz = await quizRepository.findById(quizId);
    if (!quiz) throw new NotFoundError();
    assertTeacherOwnsResource(session, quiz);
    return quizAttemptRepository.listByQuiz(quizId);
  },

  /** A single attempt — the student who submitted it, the owning teacher, or Admin. */
  async getAttempt(session: Session, id: string): Promise<QuizAttemptDoc> {
    const attempt = await quizAttemptRepository.findById(id);
    if (!attempt) throw new NotFoundError();
    if (session.role === "admin") return attempt;
    if (session.role === "student" && attempt.studentId === session.uid) return attempt;
    if (session.role === "teacher" && attempt.teacherId === session.uid) return attempt;
    throw new ForbiddenError();
  },
};
