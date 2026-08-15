import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const setQuizStatus = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/quizService", () => ({
  quizService: { setQuizStatus },
}));

const { PATCH } = await import("./route");
const { ValidationError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ quizId: "quiz-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/quizzes/quiz-1/status", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/quizzes/[quizId]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("publishes a quiz", async () => {
    setQuizStatus.mockResolvedValue({ id: "quiz-1", status: "published" });

    const res = await PATCH(makeRequest({ status: "published" }), context);

    expect(res.status).toBe(200);
    expect(setQuizStatus).toHaveBeenCalledWith(session, "quiz-1", "published");
  });

  it("rejects publishing an empty quiz", async () => {
    setQuizStatus.mockRejectedValue(new ValidationError());

    const res = await PATCH(makeRequest({ status: "published" }), context);

    expect(res.status).toBe(400);
  });
});
