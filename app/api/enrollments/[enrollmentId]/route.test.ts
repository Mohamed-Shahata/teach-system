import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getEnrollment = vi.fn();
const markLessonComplete = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/enrollmentService", () => ({
  enrollmentService: { getEnrollment, markLessonComplete },
}));

const { GET, PATCH } = await import("./route");
const { ForbiddenError, NotFoundError, UnauthorizedError } = await import("@/lib/errors");

const session = { uid: "student-1", email: "student@example.com", role: "student" };
const context = { params: Promise.resolve({ enrollmentId: "enrollment-1" }) };

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/enrollments/enrollment-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/enrollments/[enrollmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns a single enrollment", async () => {
    getEnrollment.mockResolvedValue({ id: "enrollment-1", studentId: "student-1" });

    const res = await GET(new Request("http://localhost/api/enrollments/enrollment-1"), context);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      enrollment: { id: "enrollment-1", studentId: "student-1" },
    });
    expect(getEnrollment).toHaveBeenCalledWith(session, "enrollment-1");
  });

  it("returns 404 when the enrollment doesn't exist", async () => {
    getEnrollment.mockRejectedValueOnce(new NotFoundError());

    const res = await GET(new Request("http://localhost/api/enrollments/enrollment-1"), context);

    expect(res.status).toBe(404);
  });

  it("marks a lesson complete", async () => {
    markLessonComplete.mockResolvedValue({
      id: "enrollment-1",
      progress: { completedLessonIds: ["lesson-1"], percent: 50 },
    });

    const res = await PATCH(makePatchRequest({ lessonId: "lesson-1" }), context);

    expect(res.status).toBe(200);
    expect(markLessonComplete).toHaveBeenCalledWith(session, "enrollment-1", "lesson-1");
  });

  it("returns 400 for an invalid body", async () => {
    const res = await PATCH(makePatchRequest({}), context);

    expect(res.status).toBe(400);
    expect(markLessonComplete).not.toHaveBeenCalled();
  });

  it("maps auth and role errors", async () => {
    requireSession.mockRejectedValueOnce(new UnauthorizedError());
    await expect(
      GET(new Request("http://localhost/api/enrollments/enrollment-1"), context),
    ).resolves.toHaveProperty("status", 401);

    requireSession.mockResolvedValueOnce(session);
    getEnrollment.mockRejectedValueOnce(new ForbiddenError());
    await expect(
      GET(new Request("http://localhost/api/enrollments/enrollment-1"), context),
    ).resolves.toHaveProperty("status", 403);
  });
});
