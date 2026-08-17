import "server-only";
import { assertRole, assertStudentEnrolled, assertTeacherOwnsResource } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { educationStageRepository } from "@/lib/server/repositories/educationStageRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { resolveOwnerTeacherId } from "@/lib/server/repositories/base";
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
 *
 * TASK-2104 — a standalone (course-less) exam has no enrollment to
 * check: gates on the signed-in student's own `stageId` matching the
 * quiz's `stageId` instead, and on `scheduledAt` having already
 * passed (same "doesn't exist yet" `NotFoundError` reasoning as the
 * draft-quiz case, rather than a distinct "not open yet" error).
 */
async function loadQuizForStudent(session: Session, quizId: string): Promise<QuizDoc> {
  const quiz = await quizRepository.findById(quizId);
  if (!quiz || quiz.status !== "published") throw new NotFoundError();
  if (!quiz.courseId) {
    if (!quiz.scheduledAt || quiz.scheduledAt > Date.now()) throw new NotFoundError();
    const student = await userRepository.findById(session.uid);
    if (!student || student.stageId !== quiz.stageId) throw new NotFoundError();
    return quiz;
  }
  const enrollment = await enrollmentRepository.findByStudentAndCourse(session.uid, quiz.courseId);
  assertStudentEnrolled(session, enrollment);
  return quiz;
}

/**
 * Guards a standalone exam's `stageId` against a real `educationStages`
 * document — same "never trust a client-supplied id without a lookup"
 * reasoning as `courseService.assertSubjectAndStageExist`.
 */
async function assertStageExists(stageId: string) {
  const stage = await educationStageRepository.findById(stageId);
  if (!stage) throw new ValidationError();
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

  /**
   * TASK-2101 — branches on course-attached vs standalone (`courseId`
   * absent) mode. `createQuizSchema`'s `refine`s already guarantee
   * `stageId`/`scheduledAt` are present when `courseId` is absent, so
   * this only needs to resolve ownership and validate the reference.
   */
  async createQuiz(session: Session, input: CreateQuizInput) {
    assertRole(session, "teacher", "admin");
    const now = Date.now();
    if (input.courseId) {
      const course = await courseService.getCourse(session, input.courseId);
      return quizRepository.create({
        teacherId: course.teacherId,
        courseId: course.id,
        title: input.title,
        status: "draft",
        questionIds: [],
        autoGrade: input.autoGrade ?? true,
        ...withoutUndefined({ lessonId: input.lessonId }),
        createdAt: now,
        updatedAt: now,
      });
    }
    // Standalone, stage-wide exam — no course to derive teacherId/ownership from.
    const teacherId = resolveOwnerTeacherId(session, input.teacherId);
    await assertStageExists(input.stageId!);
    return quizRepository.create({
      teacherId,
      title: input.title,
      status: "draft",
      questionIds: [],
      stageId: input.stageId,
      scheduledAt: input.scheduledAt,
      autoGrade: input.autoGrade ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateQuiz(session: Session, id: string, input: UpdateQuizInput) {
    await loadOwnedQuiz(session, id);
    if (input.stageId) {
      await assertStageExists(input.stageId);
    }
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

  /**
   * TASK-2104 — a student's "exams for my stage" list: published,
   * already-open (`scheduledAt <= now`) standalone exams targeting the
   * signed-in student's own `stageId`. A student with no `stageId` set
   * (shouldn't happen per account creation, but not guaranteed at the
   * type level) simply sees an empty list rather than an error.
   */
  async listExamsForStudent(session: Session): Promise<QuizDoc[]> {
    assertRole(session, "student");
    const student = await userRepository.findById(session.uid);
    if (!student?.stageId) return [];
    const quizzes = await quizRepository.listByStage(student.stageId);
    const now = Date.now();
    return quizzes
      .filter((quiz) => quiz.status === "published" && !!quiz.scheduledAt && quiz.scheduledAt <= now)
      .sort((a, b) => (b.scheduledAt ?? 0) - (a.scheduledAt ?? 0));
  },

  /**
   * TASK-2105 — a teacher's own standalone (course-less) exams, for the
   * `teacher/exams` builder list. Admin has no `teacherId` of their own
   * to scope by, so this is teacher-only (the route it backs lives
   * under `teacher/*`, already role-gated by `proxy.ts`) — an Admin
   * managing a specific teacher's standalone exam does so via the same
   * `teacherId`-on-create path TASK-2101 already added, not this list.
   */
  async listStandaloneQuizzes(session: Session): Promise<QuizDoc[]> {
    assertRole(session, "teacher");
    return quizRepository.listByTeacher(session.uid);
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

  /**
   * TASK-3106 — the owning teacher/Admin's preview of a quiz exactly as
   * a student attempting it would see it: same `PublicQuestionDoc`
   * shape (`correctOptionIds` stripped, `toPublicQuestion`) in
   * `questionIds` order as `listQuestionsForStudent`, but reachable
   * regardless of `status` (a `draft` exam has no student-facing route
   * at all yet — this is the only way to see it rendered before
   * publishing) and ownership-checked instead of published+enrolled.
   * Deliberately does *not* reuse `listQuestionsForStudent` (which
   * hard-requires `status === "published"`) — same "one read per
   * audience, not one read with audience-specific holes poked in it"
   * reasoning as keeping `getQuiz`'s two branches separate.
   */
  async getQuizPreview(session: Session, quizId: string): Promise<{ quiz: QuizDoc; questions: PublicQuestionDoc[] }> {
    const quiz = await loadOwnedQuiz(session, quizId);
    const questions = await questionRepository.findByIds(quiz.questionIds);
    const byId = new Map(questions.map((question) => [question.id, question]));
    const orderedQuestions = quiz.questionIds
      .map((id) => byId.get(id))
      .filter((question): question is QuestionDoc => Boolean(question))
      .map(toPublicQuestion);
    return { quiz, questions: orderedQuestions };
  },
};
