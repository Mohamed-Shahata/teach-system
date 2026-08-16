import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const reportProgress = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/lessonProgressService", () => ({
  lessonProgressService: { reportProgress },
}));

const { PATCH } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

const session = { uid: "student-1", email: "student@example.com", role: "student" };
const context = { params: Promise.resolve({ lessonId: "lesson-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/lessons/lesson-1/progress", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/lessons/[lessonId]/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("reports progress", async () => {
    reportProgress.mockResolvedValue({ id: "student-1_lesson-1", watchedSeconds: 30 });

    const res = await PATCH(makeRequest({ currentTimeSeconds: 30, durationSeconds: 300 }), context);

    expect(res.status).toBe(200);
    expect(reportProgress).toHaveBeenCalledWith(session, "lesson-1", {
      currentTimeSeconds: 30,
      durationSeconds: 300,
    });
  });

  it("returns 404 for a lesson that doesn't exist", async () => {
    reportProgress.mockRejectedValue(new NotFoundError());

    const res = await PATCH(makeRequest({ currentTimeSeconds: 30, durationSeconds: 300 }), context);

    expect(res.status).toBe(404);
  });

  it("returns 403 for a student who isn't enrolled", async () => {
    reportProgress.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ currentTimeSeconds: 30, durationSeconds: 300 }), context);

    expect(res.status).toBe(403);
  });

  it("rejects a negative currentTimeSeconds", async () => {
    const res = await PATCH(makeRequest({ currentTimeSeconds: -1, durationSeconds: 300 }), context);

    expect(res.status).toBe(400);
    expect(reportProgress).not.toHaveBeenCalled();
  });
});
