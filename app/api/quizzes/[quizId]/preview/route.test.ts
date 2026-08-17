import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getQuizPreview = vi.fn();
const previewAttempt = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/quizService", () => ({
  quizService: { getQuizPreview },
}));
vi.mock("@/lib/server/services/quizAttemptService", () => ({
  quizAttemptService: { previewAttempt },
}));

const { GET, POST } = await import("./route");

const teacherSession = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ quizId: "quiz-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/quizzes/quiz-1/preview", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * TASK-3106 — this route never touches `quizAttemptRepository` at all
 * (it only imports `quizAttemptService.previewAttempt`, which itself
 * is unit-tested elsewhere to never call `.create`), so there's no
 * `quizAttempts` document these tests could assert into existence —
 * exercising that the route wires to `previewAttempt` and not
 * `submitAttempt` is the route-level half of that guarantee.
 */
describe("/api/quizzes/[quizId]/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(teacherSession);
  });

  it("returns the quiz and its public questions for the owning teacher", async () => {
    getQuizPreview.mockResolvedValue({
      quiz: { id: "quiz-1", status: "draft" },
      questions: [{ id: "q-1" }],
    });

    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1/preview"), context);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ quiz: { id: "quiz-1", status: "draft" }, questions: [{ id: "q-1" }] });
    expect(getQuizPreview).toHaveBeenCalledWith(teacherSession, "quiz-1");
  });

  it("propagates a rejection (e.g. non-owner) as an error response", async () => {
    const { ForbiddenError } = await import("@/lib/errors");
    getQuizPreview.mockRejectedValue(new ForbiddenError());

    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1/preview"), context);

    expect(res.status).toBe(403);
  });

  it("scores a preview submission via previewAttempt, never submitAttempt", async () => {
    const submitInput = { answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }] };
    previewAttempt.mockResolvedValue({ quizId: "quiz-1", score: 100, previewedAt: 123 });

    const res = await POST(makeRequest(submitInput), context);

    expect(res.status).toBe(200);
    expect(previewAttempt).toHaveBeenCalledWith(teacherSession, "quiz-1", submitInput);
    expect(await res.json()).toEqual({ result: { quizId: "quiz-1", score: 100, previewedAt: 123 } });
  });

  it("propagates a rejection (e.g. a student calling preview) as an error response", async () => {
    const { ForbiddenError } = await import("@/lib/errors");
    previewAttempt.mockRejectedValue(new ForbiddenError());

    const res = await POST(makeRequest({ answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }] }), context);

    expect(res.status).toBe(403);
  });
});
