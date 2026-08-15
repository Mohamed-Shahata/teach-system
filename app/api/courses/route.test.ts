import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listCourses = vi.fn();
const createCourse = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/courseService", () => ({
  courseService: { listCourses, createCourse },
}));

const { GET, POST } = await import("./route");
const { ForbiddenError, UnauthorizedError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/courses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("/api/courses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns the teacher's courses", async () => {
    listCourses.mockResolvedValue([{ id: "course-1", teacherId: "teacher-1" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ courses: [{ id: "course-1", teacherId: "teacher-1" }] });
    expect(listCourses).toHaveBeenCalledWith(session);
  });

  it("creates a course", async () => {
    createCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });

    const res = await POST(
      makeRequest({
        subjectId: "physics",
        stageId: "secondary-3",
        title: { en: "Intro to Physics", ar: "مقدمة في الفيزياء" },
        enrollmentType: "free",
      }),
    );

    expect(res.status).toBe(201);
    expect(createCourse).toHaveBeenCalledWith(
      session,
      expect.objectContaining({ subjectId: "physics", enrollmentType: "free" }),
    );
  });

  it("returns 400 for an invalid body", async () => {
    const res = await POST(makeRequest({ subjectId: "physics" }));

    expect(res.status).toBe(400);
    expect(createCourse).not.toHaveBeenCalled();
  });

  it("returns 400 when a paid course has no price", async () => {
    const res = await POST(
      makeRequest({
        subjectId: "physics",
        stageId: "secondary-3",
        title: { en: "Intro to Physics", ar: "مقدمة في الفيزياء" },
        enrollmentType: "paid",
      }),
    );

    expect(res.status).toBe(400);
    expect(createCourse).not.toHaveBeenCalled();
  });

  it("maps auth and role errors", async () => {
    requireSession.mockRejectedValueOnce(new UnauthorizedError());
    await expect(GET()).resolves.toHaveProperty("status", 401);

    requireSession.mockResolvedValueOnce(session);
    listCourses.mockRejectedValueOnce(new ForbiddenError());
    await expect(GET()).resolves.toHaveProperty("status", 403);
  });
});
