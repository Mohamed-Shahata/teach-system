import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const updateQuestion = vi.fn();
const deleteQuestion = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/quizService", () => ({
  quizService: { updateQuestion, deleteQuestion },
}));

const { PATCH, DELETE } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ questionId: "q-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/questions/q-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/questions/[questionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("updates a question", async () => {
    updateQuestion.mockResolvedValue({ id: "q-1", prompt: { en: "New?", ar: "جديد؟" } });

    const res = await PATCH(makeRequest({ prompt: { en: "New?", ar: "جديد؟" } }), context);

    expect(res.status).toBe(200);
    expect(updateQuestion).toHaveBeenCalledWith(session, "q-1", { prompt: { en: "New?", ar: "جديد؟" } });
  });

  it("deletes a question", async () => {
    deleteQuestion.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost/api/questions/q-1"), context);

    expect(res.status).toBe(200);
    expect(deleteQuestion).toHaveBeenCalledWith(session, "q-1");
  });

  it("propagates a forbidden error", async () => {
    updateQuestion.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ prompt: { en: "New?", ar: "جديد؟" } }), context);

    expect(res.status).toBe(403);
  });
});
