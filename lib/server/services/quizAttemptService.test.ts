import { beforeEach, describe, expect, it, vi } from "vitest";

const quizFindById = vi.fn();
const findByStudentAndCourse = vi.fn();
const questionFindByIds = vi.fn();
const attemptCreate = vi.fn();
const listByStudentAndQuiz = vi.fn();
const listByQuiz = vi.fn();
const attemptFindById = vi.fn();

vi.mock("@/lib/server/repositories/quizRepository", () => ({
  quizRepository: { findById: quizFindById },
}));

vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { findByStudentAndCourse },
}));

vi.mock("@/lib/server/repositories/questionRepository", () => ({
  questionRepository: { findByIds: questionFindByIds },
}));

vi.mock("@/lib/server/repositories/quizAttemptRepository", () => ({
  quizAttemptRepository: {
    create: attemptCreate,
    listByStudentAndQuiz,
    listByQuiz,
    findById: attemptFindById,
  },
}));

const { quizAttemptService } = await import("./quizAttemptService");
const { ForbiddenError, NotFoundError, ValidationError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "student-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const quiz = {
  id: "quiz-1",
  teacherId: "teacher-1",
  courseId: "course-1",
  title: { en: "Quiz", ar: "اختبار" },
  status: "published" as const,
  questionIds: ["q-1", "q-2"],
  autoGrade: true,
  createdAt: 1,
  updatedAt: 1,
};

const enrollment = {
  id: "student-1_course-1",
  studentId: "student-1",
  courseId: "course-1",
  teacherId: "teacher-1",
  status: "active" as const,
  enrollmentDate: 1,
  progress: { completedLessonIds: [], percent: 0 },
};

const questions = [
  {
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
  },
  {
    id: "q-2",
    teacherId: "teacher-1",
    quizId: "quiz-1",
    type: "true_false" as const,
    prompt: { en: "Sky is blue", ar: "السماء زرقاء" },
    options: [
      { id: "t", text: { en: "True", ar: "صح" } },
      { id: "f", text: { en: "False", ar: "خطأ" } },
    ],
    correctOptionIds: ["t"],
    createdAt: 1,
    updatedAt: 1,
  },
];

describe("quizAttemptService.submitAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quizFindById.mockResolvedValue(quiz);
    findByStudentAndCourse.mockResolvedValue(enrollment);
    questionFindByIds.mockResolvedValue(questions);
    attemptCreate.mockImplementation(async (doc) => ({ id: "attempt-1", ...doc }));
  });

  it("scores a fully correct submission as 100", async () => {
    const attempt = await quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
      answers: [
        { questionId: "q-1", selectedOptionIds: ["b"] },
        { questionId: "q-2", selectedOptionIds: ["t"] },
      ],
    });

    expect(attempt.score).toBe(100);
    expect(attempt.studentId).toBe("student-1");
    expect(attempt.teacherId).toBe("teacher-1");
  });

  it("scores a partially correct submission proportionally", async () => {
    const attempt = await quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
      answers: [
        { questionId: "q-1", selectedOptionIds: ["a"] },
        { questionId: "q-2", selectedOptionIds: ["t"] },
      ],
    });

    expect(attempt.score).toBe(50);
  });

  it("treats a missing answer for a question as incorrect", async () => {
    const attempt = await quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
      answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }],
    });

    expect(attempt.score).toBe(50);
  });

  it("ignores answers for question ids outside the quiz", async () => {
    const attempt = await quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
      answers: [
        { questionId: "q-1", selectedOptionIds: ["b"] },
        { questionId: "q-2", selectedOptionIds: ["t"] },
        { questionId: "not-in-quiz", selectedOptionIds: ["z"] },
      ],
    });

    expect(attempt.score).toBe(100);
  });

  it("stores a manually-graded quiz's attempt as pending_review, unscored", async () => {
    quizFindById.mockResolvedValue({ ...quiz, autoGrade: false });
    const attempt = await quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
      answers: [
        { questionId: "q-1", selectedOptionIds: ["b"] },
        { questionId: "q-2", selectedOptionIds: ["t"] },
      ],
    });

    expect(attempt.status).toBe("pending_review");
    expect(attempt.score).toBe(0);
  });

  it("rejects a submission for an unpublished quiz", async () => {
    quizFindById.mockResolvedValue({ ...quiz, status: "draft" });
    await expect(
      quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
        answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a submission for a missing quiz", async () => {
    quizFindById.mockResolvedValue(null);
    await expect(
      quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
        answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }],
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a student who isn't enrolled in the quiz's course", async () => {
    findByStudentAndCourse.mockResolvedValue(null);
    await expect(
      quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
        answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects a cancelled enrollment", async () => {
    findByStudentAndCourse.mockResolvedValue({ ...enrollment, status: "cancelled" });
    await expect(
      quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
        answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects a non-student caller", async () => {
    await expect(
      quizAttemptService.submitAttempt(makeSession("teacher", "teacher-1"), "quiz-1", {
        answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects a quiz with no questions", async () => {
    quizFindById.mockResolvedValue({ ...quiz, questionIds: [] });
    await expect(
      quizAttemptService.submitAttempt(makeSession("student"), "quiz-1", {
        answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }],
      }),
    ).rejects.toThrow(ValidationError);
  });
});

describe("quizAttemptService.listAttemptsForQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quizFindById.mockResolvedValue(quiz);
    listByQuiz.mockResolvedValue([{ id: "attempt-1", quizId: "quiz-1" }]);
  });

  it("lists attempts for the owning teacher", async () => {
    const attempts = await quizAttemptService.listAttemptsForQuiz(makeSession("teacher", "teacher-1"), "quiz-1");
    expect(attempts).toEqual([{ id: "attempt-1", quizId: "quiz-1" }]);
  });

  it("rejects a teacher who doesn't own the quiz", async () => {
    await expect(
      quizAttemptService.listAttemptsForQuiz(makeSession("teacher", "teacher-2"), "quiz-1"),
    ).rejects.toThrow(ForbiddenError);
  });

  it("rejects a student", async () => {
    await expect(quizAttemptService.listAttemptsForQuiz(makeSession("student"), "quiz-1")).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe("quizAttemptService.getAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the attempt to the submitting student", async () => {
    attemptFindById.mockResolvedValue({ id: "attempt-1", studentId: "student-1", teacherId: "teacher-1" });
    const attempt = await quizAttemptService.getAttempt(makeSession("student"), "attempt-1");
    expect(attempt.id).toBe("attempt-1");
  });

  it("returns the attempt to the owning teacher", async () => {
    attemptFindById.mockResolvedValue({ id: "attempt-1", studentId: "student-1", teacherId: "teacher-1" });
    const attempt = await quizAttemptService.getAttempt(makeSession("teacher", "teacher-1"), "attempt-1");
    expect(attempt.id).toBe("attempt-1");
  });

  it("rejects an unrelated student", async () => {
    attemptFindById.mockResolvedValue({ id: "attempt-1", studentId: "student-1", teacherId: "teacher-1" });
    await expect(quizAttemptService.getAttempt(makeSession("student", "student-2"), "attempt-1")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("throws NotFoundError for a missing attempt", async () => {
    attemptFindById.mockResolvedValue(null);
    await expect(quizAttemptService.getAttempt(makeSession("student"), "missing")).rejects.toThrow(NotFoundError);
  });
});
