import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const gradeAttempt = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/quizAttemptService", () => ({
  quizAttemptService: { gradeAttempt },
}));

const { PATCH } = await import("./route");
const { ValidationError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ quizId: "quiz-1", attemptId: "attempt-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/quizzes/quiz-1/attempts/attempt-1/grade", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/quizzes/[quizId]/attempts/[attemptId]/grade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("grades a pending_review attempt", async () => {
    gradeAttempt.mockResolvedValue({ id: "attempt-1", score: 85, status: "graded" });

    const res = await PATCH(makeRequest({ score: 85 }), context);

    expect(res.status).toBe(200);
    expect(gradeAttempt).toHaveBeenCalledWith(session, "attempt-1", 85);
    expect(await res.json()).toEqual({ attempt: { id: "attempt-1", score: 85, status: "graded" } });
  });

  it("rejects an out-of-range score before hitting the service", async () => {
    const res = await PATCH(makeRequest({ score: 150 }), context);

    expect(res.status).toBe(400);
    expect(gradeAttempt).not.toHaveBeenCalled();
  });

  it("propagates a rejection (e.g. already graded) as an error response", async () => {
    gradeAttempt.mockRejectedValue(new ValidationError());

    const res = await PATCH(makeRequest({ score: 50 }), context);

    expect(res.status).toBe(400);
  });
});
