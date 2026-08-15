import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listQuizzes = vi.fn();
const createQuiz = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/quizService", () => ({
  quizService: { listQuizzes, createQuiz },
}));

const { GET, POST } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ courseId: "course-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/courses/course-1/quizzes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/courses/[courseId]/quizzes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("lists quizzes for a course", async () => {
    listQuizzes.mockResolvedValue([{ id: "quiz-1" }]);

    const res = await GET(new Request("http://localhost/api/courses/course-1/quizzes"), context);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ quizzes: [{ id: "quiz-1" }] });
    expect(listQuizzes).toHaveBeenCalledWith(session, "course-1");
  });

  it("creates a quiz", async () => {
    createQuiz.mockResolvedValue({ id: "quiz-1", status: "draft" });

    const res = await POST(makeRequest({ title: { en: "Quiz 1", ar: "اختبار 1" } }), context);

    expect(res.status).toBe(201);
    expect(createQuiz).toHaveBeenCalledWith(session, {
      title: { en: "Quiz 1", ar: "اختبار 1" },
      courseId: "course-1",
    });
  });

  it("propagates a forbidden error", async () => {
    listQuizzes.mockRejectedValue(new ForbiddenError());

    const res = await GET(new Request("http://localhost/api/courses/course-1/quizzes"), context);

    expect(res.status).toBe(403);
  });
});
