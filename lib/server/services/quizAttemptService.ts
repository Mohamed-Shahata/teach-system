import "server-only";
import { assertRole, assertStudentEnrolled, assertTeacherOwnsResource } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { questionRepository } from "@/lib/server/repositories/questionRepository";
import { quizAttemptRepository, type QuizAttemptDoc } from "@/lib/server/repositories/quizAttemptRepository";
import { quizRepository } from "@/lib/server/repositories/quizRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { computeScore } from "@/lib/server/quizGrading";
import type { SubmitQuizAttemptInput } from "@/lib/validation/quiz.schema";

/**
 * Quiz attempt submission & grading — TASK-1202. Scores a submission
 * server-side against the stored `correctOptionIds` (never trusting a
 * client-submitted score, per `features/quizzes.md`) and writes
 * `quizAttempts`. Layered on top of `quizService` (TASK-1201) rather
 * than folded into it, since `quizAttempts` is its own collection with
 * its own access rules (a student's *history* of attempts, not a
 * teacher-owned CRUD resource).
 *
 * Grading itself (`isAnswerCorrect`/`computeScore`) lives in
 * `lib/server/quizGrading.ts` (moved there for TASK-3106) so the
 * teacher-preview flow scores identically without persisting anything.
 */

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
    if (!quiz.courseId) {
      // TASK-2104 — a standalone stage-wide exam has no course
      // enrollment to check; gate on the student's own `stageId`
      // matching the quiz's target stage instead. Not open yet
      // (`scheduledAt` in the future) is treated the same as
      // not-found, same reasoning as `quizService.loadQuizForStudent`.
      if (!quiz.scheduledAt || quiz.scheduledAt > Date.now()) {
        throw new NotFoundError();
      }
      const student = await userRepository.findById(session.uid);
      if (!student || student.stageId !== quiz.stageId) {
        throw new ForbiddenError();
      }
    } else {
      const enrollment = await enrollmentRepository.findByStudentAndCourse(session.uid, quiz.courseId);
      assertStudentEnrolled(session, enrollment);
    }

    const questions = await questionRepository.findByIds(quiz.questionIds);

    // TASK-2102 — a manually-graded quiz (`autoGrade: false`) still stores the
    // raw answers, but doesn't compute/reveal a score yet: the attempt sits
    // `pending_review` until a teacher grades it (TASK-2103). `score` is a `0`
    // placeholder in that state, not a real result.
    const attempt = await quizAttemptRepository.create({
      studentId: session.uid,
      quizId: quiz.id,
      teacherId: quiz.teacherId,
      answers: input.answers,
      score: quiz.autoGrade ? computeScore(questions, input.answers) : 0,
      status: quiz.autoGrade ? "graded" : "pending_review",
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

  /**
   * TASK-2103 — teacher/Admin sets a final score for a manually-graded
   * (`autoGrade: false`) attempt sitting `pending_review`. Verifies quiz
   * ownership the same way `listAttemptsForQuiz` does, then rejects
   * grading an attempt that isn't `pending_review` — either it's already
   * `graded` (no re-grading through this endpoint) or it belongs to an
   * auto-graded quiz, which never produces a `pending_review` attempt.
   */
  async gradeAttempt(session: Session, attemptId: string, score: number): Promise<QuizAttemptDoc> {
    assertRole(session, "teacher", "admin");

    const attempt = await quizAttemptRepository.findById(attemptId);
    if (!attempt) throw new NotFoundError();

    const quiz = await quizRepository.findById(attempt.quizId);
    if (!quiz) throw new NotFoundError();
    assertTeacherOwnsResource(session, quiz);

    if (attempt.status !== "pending_review") {
      throw new ValidationError();
    }

    return quizAttemptRepository.update(attemptId, {
      score,
      status: "graded",
      gradedBy: session.uid,
      gradedAt: Date.now(),
    });
  },

  /**
   * TASK-3106 — the owning teacher/Admin "submits" a preview run of
   * their own quiz. Scores with the exact same rule a real attempt
   * uses (`computeScore`, shared via `lib/server/quizGrading.ts`), but
   * — unlike `submitAttempt` — never calls `quizAttemptRepository.create`
   * and is reachable for a `draft` quiz (a real attempt requires
   * `published`). The returned shape mirrors `QuizAttemptDoc` closely
   * enough for the student-facing results card to render unmodified,
   * but is never written anywhere and has no `id` a later lookup could
   * resolve — `previewedAt` instead of `submittedAt` makes that
   * ephemeral nature explicit to any caller reading the shape.
   */
  async previewAttempt(session: Session, quizId: string, input: SubmitQuizAttemptInput) {
    assertRole(session, "teacher", "admin");
    const quiz = await quizRepository.findById(quizId);
    if (!quiz) throw new NotFoundError();
    assertTeacherOwnsResource(session, quiz);

    const questions = await questionRepository.findByIds(quiz.questionIds);
    return {
      quizId: quiz.id,
      answers: input.answers,
      score: computeScore(questions, input.answers),
      previewedAt: Date.now(),
    };
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
