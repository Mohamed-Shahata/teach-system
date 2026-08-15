import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listMyAttempts = vi.fn();
const submitAttempt = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/quizAttemptService", () => ({
  quizAttemptService: { listMyAttempts, submitAttempt },
}));

const { GET, POST } = await import("./route");

const session = { uid: "student-1", email: "student@example.com", role: "student" };
const context = { params: Promise.resolve({ quizId: "quiz-1" }) };

const submitInput = {
  answers: [{ questionId: "q-1", selectedOptionIds: ["b"] }],
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/quizzes/quiz-1/attempts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/quizzes/[quizId]/attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("lists the signed-in student's own attempts", async () => {
    listMyAttempts.mockResolvedValue([{ id: "attempt-1", score: 100 }]);

    const res = await GET(new Request("http://localhost/api/quizzes/quiz-1/attempts"), context);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ attempts: [{ id: "attempt-1", score: 100 }] });
    expect(listMyAttempts).toHaveBeenCalledWith(session, "quiz-1");
  });

  it("submits an attempt and returns it with a 201", async () => {
    submitAttempt.mockResolvedValue({ id: "attempt-1", score: 100, ...submitInput });

    const res = await POST(makeRequest(submitInput), context);

    expect(res.status).toBe(201);
    expect(submitAttempt).toHaveBeenCalledWith(session, "quiz-1", submitInput);
    expect(await res.json()).toEqual({ attempt: { id: "attempt-1", score: 100, ...submitInput } });
  });

  it("propagates a rejection (e.g. not enrolled) as an error response", async () => {
    const { ForbiddenError } = await import("@/lib/errors");
    submitAttempt.mockRejectedValue(new ForbiddenError());

    const res = await POST(makeRequest(submitInput), context);

    expect(res.status).toBe(403);
  });
});
