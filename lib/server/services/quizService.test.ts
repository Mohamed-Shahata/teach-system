import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const quizListByCourse = vi.fn();
const quizFindById = vi.fn();
const quizCreate = vi.fn();
const quizUpdate = vi.fn();
const quizDelete = vi.fn();

const questionListByQuiz = vi.fn();
const questionFindByIds = vi.fn();
const questionFindById = vi.fn();
const questionCreate = vi.fn();
const questionUpdate = vi.fn();
const questionDelete = vi.fn();

const getCourse = vi.fn();
const findByStudentAndCourse = vi.fn();
const userFindById = vi.fn();
const quizListByStage = vi.fn();
const quizListByTeacher = vi.fn();
const stageFindById = vi.fn();

vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { findByStudentAndCourse },
}));

vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findById: userFindById },
}));

vi.mock("@/lib/server/repositories/educationStageRepository", () => ({
  educationStageRepository: { findById: stageFindById },
}));

vi.mock("@/lib/server/repositories/quizRepository", () => ({
  quizRepository: {
    listByCourse: quizListByCourse,
    listByStage: quizListByStage,
    listByTeacher: quizListByTeacher,
    findById: quizFindById,
    create: quizCreate,
    update: quizUpdate,
    delete: quizDelete,
  },
}));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: {},
}));

vi.mock("@/lib/server/repositories/questionRepository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/repositories/questionRepository")>(
    "@/lib/server/repositories/questionRepository",
  );
  return {
    ...actual,
    questionRepository: {
      listByQuiz: questionListByQuiz,
      findByIds: questionFindByIds,
      findById: questionFindById,
      create: questionCreate,
      update: questionUpdate,
      delete: questionDelete,
    },
  };
});

vi.mock("@/lib/server/services/courseService", () => ({
  courseService: { getCourse },
}));

const { quizService } = await import("./quizService");
const { ForbiddenError, NotFoundError, ValidationError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const course = { id: "course-1", teacherId: "teacher-1" };
const quiz = {
  id: "quiz-1",
  teacherId: "teacher-1",
  courseId: "course-1",
  title: { en: "Quiz 1", ar: "اختبار 1" },
  status: "draft" as const,
  questionIds: ["q-1", "q-2"],
  autoGrade: true,
  createdAt: 1,
  updatedAt: 1,
};

const question = {
  id: "q-1",
  teacherId: "teacher-1",
  quizId: "quiz-1",
  type: "multiple_choice" as const,
  prompt: { en: "2+2?", ar: "٢+٢؟" },
  options: [
    { id: "a", text: { en: "3", ar: "٣" } },
    { id: "b", text: { en: "4", ar: "٤" } },
  ],
  correctOptionIds: ["b"],
  createdAt: 1,
  updatedAt: 1,
};

describe("quizService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCourse.mockResolvedValue(course);
    quizFindById.mockResolvedValue(quiz);
    quizListByCourse.mockResolvedValue([quiz]);
    quizCreate.mockImplementation(async (doc) => ({ id: "quiz-1", ...doc }));
    quizUpdate.mockImplementation(async (_session, id, patch) => ({ ...quiz, id, ...patch }));
    quizDelete.mockResolvedValue(quiz);
    questionListByQuiz.mockResolvedValue([question]);
    questionFindByIds.mockResolvedValue([question]);
    questionFindById.mockResolvedValue(question);
    questionCreate.mockImplementation(async (doc) => ({ id: "q-3", ...doc }));
    questionUpdate.mockImplementation(async (_session, id, patch) => ({ ...question, id, ...patch }));
    questionDelete.mockResolvedValue(question);
    findByStudentAndCourse.mockResolvedValue(null);
    userFindById.mockResolvedValue(null);
    quizListByStage.mockResolvedValue([]);
    stageFindById.mockResolvedValue({
      id: "stage-1",
      order: 1,
      name: { en: "Stage", ar: "مرحلة" },
      category: "primary",
    });
  });

  it("lists quizzes for a course after verifying course ownership", async () => {
    const session = makeSession("teacher");
    const quizzes = await quizService.listQuizzes(session, "course-1");

    expect(getCourse).toHaveBeenCalledWith(session, "course-1");
    expect(quizzes).toEqual([quiz]);
  });

  it("rejects a student from listing quizzes", async () => {
    await expect(quizService.listQuizzes(makeSession("student"), "course-1")).rejects.toThrow(ForbiddenError);
  });

  it("creates a quiz as draft with no questions", async () => {
    const session = makeSession("teacher");
    const created = await quizService.createQuiz(session, {
      courseId: "course-1",
      title: { en: "New Quiz", ar: "اختبار جديد" },
    });

    expect(created.status).toBe("draft");
    expect(created.questionIds).toEqual([]);
    expect(created.teacherId).toBe("teacher-1");
  });

  it("rejects publishing a quiz with no questions", async () => {
    quizFindById.mockResolvedValue({ ...quiz, questionIds: [] });
    await expect(quizService.setQuizStatus(makeSession("teacher"), "quiz-1", "published")).rejects.toThrow(
      ValidationError,
    );
  });

  it("publishes a quiz that has questions", async () => {
    const updated = await quizService.setQuizStatus(makeSession("teacher"), "quiz-1", "published");
    expect(updated.status).toBe("published");
  });

  it("rejects a teacher acting on another teacher's quiz", async () => {
    await expect(quizService.getQuiz(makeSession("teacher", "teacher-2"), "quiz-1")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("throws NotFoundError for a missing quiz", async () => {
    quizFindById.mockResolvedValue(null);
    await expect(quizService.getQuiz(makeSession("teacher"), "missing")).rejects.toThrow(NotFoundError);
  });

  it("lets an enrolled student read a published quiz", async () => {
    quizFindById.mockResolvedValue({ ...quiz, status: "published" });
    findByStudentAndCourse.mockResolvedValue({ studentId: "student-1", status: "active" });

    const found = await quizService.getQuiz(makeSession("student", "student-1"), "quiz-1");

    expect(found.id).toBe("quiz-1");
    expect(findByStudentAndCourse).toHaveBeenCalledWith("student-1", "course-1");
  });

  it("hides a draft quiz from a student as NotFoundError", async () => {
    quizFindById.mockResolvedValue({ ...quiz, status: "draft" });
    await expect(quizService.getQuiz(makeSession("student", "student-1"), "quiz-1")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("rejects a student who isn't enrolled in the quiz's course", async () => {
    quizFindById.mockResolvedValue({ ...quiz, status: "published" });
    findByStudentAndCourse.mockResolvedValue(null);
    await expect(quizService.getQuiz(makeSession("student", "student-1"), "quiz-1")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("creates a question and appends it to the quiz's questionIds", async () => {
    const session = makeSession("teacher");
    const input = {
      type: "multiple_choice" as const,
      prompt: { en: "1+1?", ar: "١+١؟" },
      options: [
        { id: "a", text: { en: "1", ar: "١" } },
        { id: "b", text: { en: "2", ar: "٢" } },
      ],
      correctOptionIds: ["b"],
    };

    await quizService.createQuestion(session, "quiz-1", input);

    expect(quizUpdate).toHaveBeenCalledWith(
      session,
      "quiz-1",
      expect.objectContaining({ questionIds: ["q-1", "q-2", "q-3"] }),
    );
  });

  it("removes a deleted question's id from the quiz", async () => {
    const session = makeSession("teacher");
    await quizService.deleteQuestion(session, "q-1");

    expect(quizUpdate).toHaveBeenCalledWith(
      session,
      "quiz-1",
      expect.objectContaining({ questionIds: ["q-2"] }),
    );
  });

  it("rejects reordering questions with a mismatched id set", async () => {
    await expect(
      quizService.reorderQuestions(makeSession("teacher"), "quiz-1", ["q-1", "q-3"]),
    ).rejects.toThrow(ValidationError);
  });

  it("reorders questions with the same id set", async () => {
    const updated = await quizService.reorderQuestions(makeSession("teacher"), "quiz-1", ["q-2", "q-1"]);
    expect(updated.questionIds).toEqual(["q-2", "q-1"]);
  });

  it("strips correctOptionIds from the student-facing question list", async () => {
    quizFindById.mockResolvedValue({ ...quiz, status: "published" });
    questionFindByIds.mockResolvedValue([question]);

    const questions = await quizService.listQuestionsForStudent("quiz-1");

    expect(questions).toEqual([
      {
        id: "q-1",
        teacherId: "teacher-1",
        quizId: "quiz-1",
        type: "multiple_choice",
        prompt: question.prompt,
        options: question.options,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);
    expect(questions[0]).not.toHaveProperty("correctOptionIds");
  });

  it("hides a draft quiz's questions from a student read", async () => {
    quizFindById.mockResolvedValue({ ...quiz, status: "draft" });
    await expect(quizService.listQuestionsForStudent("quiz-1")).rejects.toThrow(NotFoundError);
  });

  it("deletes a quiz's questions before deleting the quiz", async () => {
    const session = makeSession("teacher");
    questionListByQuiz.mockResolvedValue([question, { ...question, id: "q-2" }]);

    await quizService.deleteQuiz(session, "quiz-1");

    expect(questionDelete).toHaveBeenCalledWith(session, "q-1");
    expect(questionDelete).toHaveBeenCalledWith(session, "q-2");
    expect(quizDelete).toHaveBeenCalledWith(session, "quiz-1");
  });
});

describe("quizService — standalone stage-wide exams (TASK-2104)", () => {
  const standaloneQuiz = {
    id: "quiz-2",
    teacherId: "teacher-1",
    title: { en: "Stage exam", ar: "اختبار المرحلة" },
    status: "published" as const,
    questionIds: ["q-1"],
    stageId: "stage-1",
    scheduledAt: 1_000,
    autoGrade: true,
    createdAt: 1,
    updatedAt: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    quizFindById.mockResolvedValue(standaloneQuiz);
    userFindById.mockResolvedValue({ uid: "student-1", stageId: "stage-1" });
    quizListByStage.mockResolvedValue([standaloneQuiz]);
    vi.useFakeTimers();
    vi.setSystemTime(2_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets a student in the matching stage open an open standalone exam", async () => {
    const found = await quizService.getQuiz(makeSession("student", "student-1"), "quiz-2");
    expect(found.id).toBe("quiz-2");
  });

  it("hides a standalone exam from a student in a different stage", async () => {
    userFindById.mockResolvedValue({ uid: "student-1", stageId: "stage-2" });
    await expect(quizService.getQuiz(makeSession("student", "student-1"), "quiz-2")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("hides a standalone exam that hasn't opened yet", async () => {
    quizFindById.mockResolvedValue({ ...standaloneQuiz, scheduledAt: 3_000 });
    await expect(quizService.getQuiz(makeSession("student", "student-1"), "quiz-2")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("lists open, published exams for the student's own stage", async () => {
    const exams = await quizService.listExamsForStudent(makeSession("student", "student-1"));
    expect(exams).toEqual([standaloneQuiz]);
    expect(quizListByStage).toHaveBeenCalledWith("stage-1");
  });

  it("excludes exams that haven't opened yet or aren't published", async () => {
    quizListByStage.mockResolvedValue([
      standaloneQuiz,
      { ...standaloneQuiz, id: "quiz-3", scheduledAt: 5_000 },
      { ...standaloneQuiz, id: "quiz-4", status: "draft" as const },
    ]);
    const exams = await quizService.listExamsForStudent(makeSession("student", "student-1"));
    expect(exams.map((exam) => exam.id)).toEqual(["quiz-2"]);
  });

  it("returns an empty list for a student with no stageId set", async () => {
    userFindById.mockResolvedValue({ uid: "student-1" });
    const exams = await quizService.listExamsForStudent(makeSession("student", "student-1"));
    expect(exams).toEqual([]);
    expect(quizListByStage).not.toHaveBeenCalled();
  });
});

describe("quizService — standalone exam builder list (TASK-2105)", () => {
  const standaloneQuiz = {
    id: "quiz-5",
    teacherId: "teacher-1",
    title: { en: "Stage exam", ar: "اختبار المرحلة" },
    status: "draft" as const,
    questionIds: [],
    stageId: "stage-1",
    scheduledAt: 1_000,
    autoGrade: true,
    createdAt: 1,
    updatedAt: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    quizListByTeacher.mockResolvedValue([standaloneQuiz]);
  });

  it("lists the signed-in teacher's own standalone exams", async () => {
    const quizzes = await quizService.listStandaloneQuizzes(makeSession("teacher", "teacher-1"));
    expect(quizzes).toEqual([standaloneQuiz]);
    expect(quizListByTeacher).toHaveBeenCalledWith("teacher-1");
  });

  it("rejects a student", async () => {
    await expect(quizService.listStandaloneQuizzes(makeSession("student", "student-1"))).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("rejects an admin (no own teacherId to scope by)", async () => {
    await expect(quizService.listStandaloneQuizzes(makeSession("admin", "admin-1"))).rejects.toThrow(
      ForbiddenError,
    );
  });
});
