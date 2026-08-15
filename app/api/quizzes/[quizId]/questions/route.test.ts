import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listQuestions = vi.fn();
const createQuestion = vi.fn();
const reorderQuestions = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/quizService", () => ({
  quizService: { listQuestions, createQuestion, reorderQuestions },
}));

const { GET, POST, PATCH } = await import("./route");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ quizId: "quiz-1" }) };

const questionInput = {
  type: "multiple_choice" as const,
  prompt: { en: "What is 2+2?", ar: "كم يساوي ٢+٢؟" },
  options: [
    { id: "a", text: { en: "Three", ar: "ثلاثة" } },
    { id: "b", text: { en: "Four", ar: "أربعة" } },
  ],
  correctOptionIds: ["b"],
};

function makeRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/quizzes/quiz-1/questions", {
    method,
    body: JSON.stringify(body),
  });
}

describe("/api/quizzes/[quizId]/questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("lists questions for a quiz", async () => {
    listQuestions.mockResolvedValue([{ id: "q-1" }]);

    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1/questions"), context);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ questions: [{ id: "q-1" }] });
  });

  it("creates a question", async () => {
    createQuestion.mockResolvedValue({ id: "q-1", ...questionInput });

    const res = await POST(makeRequest(questionInput), context);

    expect(res.status).toBe(201);
    expect(createQuestion).toHaveBeenCalledWith(session, "quiz-1", questionInput);
  });

  it("reorders questions", async () => {
    reorderQuestions.mockResolvedValue({ id: "quiz-1", questionIds: ["q-2", "q-1"] });

    const res = await PATCH(makeRequest({ questionIds: ["q-2", "q-1"] }, "PATCH"), context);

    expect(res.status).toBe(200);
    expect(reorderQuestions).toHaveBeenCalledWith(session, "quiz-1", ["q-2", "q-1"]);
  });
});
