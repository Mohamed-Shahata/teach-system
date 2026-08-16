import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getCourseStudentsProgress = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/studentService", () => ({
  studentService: { getCourseStudentsProgress },
}));

const { GET } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ courseId: "course-1" }) };

describe("/api/courses/[courseId]/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns per-student watch progress for a course", async () => {
    getCourseStudentsProgress.mockResolvedValue([
      { studentId: "student-1", displayName: "Amira", email: "amira@example.com", overallPercent: 75, lessons: [] },
    ]);

    const res = await GET(new Request("http://localhost/api/courses/course-1/students"), context);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      students: [
        { studentId: "student-1", displayName: "Amira", email: "amira@example.com", overallPercent: 75, lessons: [] },
      ],
    });
    expect(getCourseStudentsProgress).toHaveBeenCalledWith(session, "course-1");
  });

  it("maps a missing course to 404", async () => {
    getCourseStudentsProgress.mockRejectedValue(new NotFoundError());

    const res = await GET(new Request("http://localhost/api/courses/course-1/students"), context);

    expect(res.status).toBe(404);
  });

  it("maps ownership errors to 403", async () => {
    getCourseStudentsProgress.mockRejectedValue(new ForbiddenError());

    const res = await GET(new Request("http://localhost/api/courses/course-1/students"), context);

    expect(res.status).toBe(403);
  });
});
