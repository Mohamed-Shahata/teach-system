import "server-only";
import { assertRole, assertStudentEnrolled, assertTeacherOwnsResource } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { quizRepository, type QuizDoc } from "@/lib/server/repositories/quizRepository";
import {
  questionRepository,
  toPublicQuestion,
  type PublicQuestionDoc,
  type QuestionDoc,
} from "@/lib/server/repositories/questionRepository";
import { courseService } from "@/lib/server/services/courseService";
import type {
  CreateQuestionInput,
  CreateQuizInput,
  UpdateQuestionInput,
  UpdateQuizInput,
} from "@/lib/validation/quiz.schema";

/**
 * Quiz/question service — TASK-1201. CRUD for `quizzes`/`questions`,
 * scoped to the owning teacher (or Admin) the same way
 * `lessonService` scopes lessons to a course. `correctOptionIds` is
 * never returned from `getQuizForStudent`/`listQuestionsForStudent` —
 * see `questionRepository.toPublicQuestion` — per
 * `docs/features/quizzes.md`'s authorization rules. Grading
 * (`quizAttempts`, TASK-1202) is a separate service layered on top.
 */

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

async function loadOwnedQuiz(session: Session, quizId: string): Promise<QuizDoc> {
  const quiz = await quizRepository.findById(quizId);
  if (!quiz) throw new NotFoundError();
  assertTeacherOwnsResource(session, quiz);
  return quiz;
}

/**
 * TASK-1204 — a student's view of a single quiz: must be `published`
 * (a draft doesn't exist yet as far as a student is concerned, same
 * `NotFoundError`-not-`ForbiddenError` reasoning as `listQuestionsForStudent`
 * below) and the student must hold a non-cancelled enrollment in the
 * quiz's course. Admin bypasses the enrollment check, same as everywhere
 * else `assertStudentEnrolled` is used.
 */
async function loadQuizForStudent(session: Session, quizId: string): Promise<QuizDoc> {
  const quiz = await quizRepository.findById(quizId);
  if (!quiz || quiz.status !== "published") throw new NotFoundError();
  const enrollment = await enrollmentRepository.findByStudentAndCourse(session.uid, quiz.courseId);
  assertStudentEnrolled(session, enrollment);
  return quiz;
}

export const quizService = {
  /** Teacher/Admin — every quiz for a course, draft and published, for the builder UI (TASK-1203). */
  async listQuizzes(session: Session, courseId: string) {
    assertRole(session, "teacher", "admin");
    await courseService.getCourse(session, courseId);
    return quizRepository.listByCourse(courseId);
  },

  /**
   * Single-quiz read, doubling as both the teacher/Admin builder read
   * (ownership-scoped) and the student quiz-taking read (published +
   * enrolled, TASK-1204) — same "one endpoint, role-branched service
   * method" shape as `paymentService.getPayment`/enrollment's single-
   * resource reads, rather than a separate route per audience.
   */
  async getQuiz(session: Session, id: string) {
    assertRole(session, "teacher", "admin", "student");
    if (session.role === "student") {
      return loadQuizForStudent(session, id);
    }
    return loadOwnedQuiz(session, id);
  },

  async createQuiz(session: Session, input: CreateQuizInput) {
    assertRole(session, "teacher", "admin");
    const course = await courseService.getCourse(session, input.courseId);
    const now = Date.now();
    return quizRepository.create({
      teacherId: course.teacherId,
      courseId: course.id,
      title: input.title,
      status: "draft",
      questionIds: [],
      ...withoutUndefined({ lessonId: input.lessonId }),
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateQuiz(session: Session, id: string, input: UpdateQuizInput) {
    await loadOwnedQuiz(session, id);
    const { lessonId, ...rest } = input;
    return quizRepository.update(session, id, {
      ...withoutUndefined(rest),
      ...(lessonId !== undefined ? { lessonId: lessonId ?? undefined } : {}),
      updatedAt: Date.now(),
    });
  },

  /**
   * Publishing requires at least one question — an empty published quiz
   * would give a student nothing to take (`features/quizzes.md`'s
   * "let students take quizzes" user story implies a non-empty quiz).
   */
  async setQuizStatus(session: Session, id: string, status: QuizDoc["status"]) {
    const quiz = await loadOwnedQuiz(session, id);
    if (status === "published" && quiz.questionIds.length === 0) {
      throw new ValidationError();
    }
    return quizRepository.update(session, id, { status, updatedAt: Date.now() });
  },

  async deleteQuiz(session: Session, id: string) {
    const quiz = await loadOwnedQuiz(session, id);
    const questions = await questionRepository.listByQuiz(id);
    await Promise.all(questions.map((question) => questionRepository.delete(session, question.id)));
    await quizRepository.delete(session, quiz.id);
  },

  /** Reorders `quiz.questionIds` — same full-replace contract as `lessonService.reorderLessons`. */
  async reorderQuestions(session: Session, id: string, questionIds: string[]) {
    const quiz = await loadOwnedQuiz(session, id);
    const currentIds = new Set(quiz.questionIds);
    const nextIds = new Set(questionIds);
    const sameSet =
      currentIds.size === nextIds.size &&
      questionIds.length === new Set(questionIds).size &&
      quiz.questionIds.every((qid) => nextIds.has(qid));
    if (!sameSet) {
      throw new ValidationError();
    }
    return quizRepository.update(session, id, { questionIds, updatedAt: Date.now() });
  },

  // -- Questions --------------------------------------------------------

  /** Teacher/Admin full read — includes `correctOptionIds`, for the builder UI. */
  async listQuestions(session: Session, quizId: string): Promise<QuestionDoc[]> {
    await loadOwnedQuiz(session, quizId);
    return questionRepository.listByQuiz(quizId);
  },

  async createQuestion(session: Session, quizId: string, input: CreateQuestionInput) {
    const quiz = await loadOwnedQuiz(session, quizId);
    const now = Date.now();
    const question = await questionRepository.create({
      teacherId: quiz.teacherId,
      quizId: quiz.id,
      type: input.type,
      prompt: input.prompt,
      options: input.options,
      correctOptionIds: input.correctOptionIds,
      createdAt: now,
      updatedAt: now,
    });
    await quizRepository.update(session, quizId, {
      questionIds: [...quiz.questionIds, question.id],
      updatedAt: now,
    });
    return question;
  },

  async updateQuestion(session: Session, id: string, input: UpdateQuestionInput) {
    assertRole(session, "teacher", "admin");
    const existing = await questionRepository.findById(id);
    if (!existing) throw new NotFoundError();
    assertTeacherOwnsResource(session, existing);
    return questionRepository.update(session, id, {
      ...withoutUndefined(input),
      updatedAt: Date.now(),
    });
  },

  async deleteQuestion(session: Session, id: string) {
    assertRole(session, "teacher", "admin");
    const existing = await questionRepository.findById(id);
    if (!existing) throw new NotFoundError();
    assertTeacherOwnsResource(session, existing);
    const quiz = await quizRepository.findById(existing.quizId);
    await questionRepository.delete(session, id);
    if (quiz) {
      await quizRepository.update(session, quiz.id, {
        questionIds: quiz.questionIds.filter((qid) => qid !== id),
        updatedAt: Date.now(),
      });
    }
  },

  /**
   * Student-facing read of a published quiz's questions, in
   * `quiz.questionIds` order, with `correctOptionIds` stripped
   * (`toPublicQuestion`) — the one path a student ever reaches
   * `questions` through. Enrollment gating happens in TASK-1202's
   * attempt-submission service, which is the actual point a student
   * needs to be enrolled at; this read-only listing itself only
   * requires the quiz to be published (same "published is public to
   * enrolled students" model as `courseService`'s published-course
   * reads).
   */
  async listQuestionsForStudent(quizId: string): Promise<PublicQuestionDoc[]> {
    const quiz = await quizRepository.findById(quizId);
    if (!quiz || quiz.status !== "published") {
      throw new NotFoundError();
    }
    const questions = await questionRepository.findByIds(quiz.questionIds);
    const byId = new Map(questions.map((question) => [question.id, question]));
    return quiz.questionIds
      .map((id) => byId.get(id))
      .filter((question): question is QuestionDoc => Boolean(question))
      .map(toPublicQuestion);
  },
};
