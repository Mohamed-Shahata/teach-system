import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getQuiz = vi.fn();
const updateQuiz = vi.fn();
const deleteQuiz = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/quizService", () => ({
  quizService: { getQuiz, updateQuiz, deleteQuiz },
}));

const { GET, PATCH, DELETE } = await import("./route");
const { NotFoundError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ quizId: "quiz-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/quizzes/quiz-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/quizzes/[quizId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns a quiz", async () => {
    getQuiz.mockResolvedValue({ id: "quiz-1" });

    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1"), context);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ quiz: { id: "quiz-1" } });
  });

  it("updates a quiz", async () => {
    updateQuiz.mockResolvedValue({ id: "quiz-1", title: { en: "New", ar: "جديد" } });

    const res = await PATCH(makeRequest({ title: { en: "New", ar: "جديد" } }), context);

    expect(res.status).toBe(200);
    expect(updateQuiz).toHaveBeenCalledWith(session, "quiz-1", { title: { en: "New", ar: "جديد" } });
  });

  it("returns 404 for a quiz that doesn't exist / isn't owned", async () => {
    getQuiz.mockRejectedValue(new NotFoundError());

    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1"), context);

    expect(res.status).toBe(404);
  });

  it("deletes a quiz", async () => {
    deleteQuiz.mockResolvedValue(undefined);

    const res = await DELETE(new Request("http://localhost/api/quizzes/quiz-1"), context);

    expect(res.status).toBe(200);
    expect(deleteQuiz).toHaveBeenCalledWith(session, "quiz-1");
  });
});
