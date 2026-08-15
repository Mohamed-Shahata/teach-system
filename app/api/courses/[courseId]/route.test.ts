import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const getCourse = vi.fn();
const updateCourse = vi.fn();
const publishCourse = vi.fn();
const unpublishCourse = vi.fn();
const deleteCourse = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/courseService", () => ({
  courseService: { getCourse, updateCourse, publishCourse, unpublishCourse, deleteCourse },
}));

const { DELETE, GET, PATCH } = await import("./route");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

const session = { uid: "teacher-1", email: "teacher@example.com", role: "teacher" };
const context = { params: Promise.resolve({ courseId: "course-1" }) };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/courses/course-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("/api/courses/[courseId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns one course", async () => {
    getCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });

    const res = await GET(new Request("http://localhost/api/courses/course-1"), context);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ course: { id: "course-1", teacherId: "teacher-1" } });
    expect(getCourse).toHaveBeenCalledWith(session, "course-1");
  });

  it("returns 404 for a course that doesn't exist / isn't owned", async () => {
    getCourse.mockRejectedValue(new NotFoundError());

    const res = await GET(new Request("http://localhost/api/courses/course-1"), context);

    expect(res.status).toBe(404);
  });

  it("updates course fields", async () => {
    updateCourse.mockResolvedValue({ id: "course-1", subjectId: "chemistry" });

    const res = await PATCH(makeRequest({ subjectId: "chemistry" }), context);

    expect(res.status).toBe(200);
    expect(updateCourse).toHaveBeenCalledWith(session, "course-1", { subjectId: "chemistry" });
    expect(publishCourse).not.toHaveBeenCalled();
  });

  it("publishes a course when the body is a status toggle", async () => {
    publishCourse.mockResolvedValue({ id: "course-1", status: "published" });

    const res = await PATCH(makeRequest({ status: "published" }), context);

    expect(res.status).toBe(200);
    expect(publishCourse).toHaveBeenCalledWith(session, "course-1");
    expect(updateCourse).not.toHaveBeenCalled();
  });

  it("unpublishes a course when the body is a status toggle", async () => {
    unpublishCourse.mockResolvedValue({ id: "course-1", status: "draft" });

    const res = await PATCH(makeRequest({ status: "draft" }), context);

    expect(res.status).toBe(200);
    expect(unpublishCourse).toHaveBeenCalledWith(session, "course-1");
  });

  it("deletes a course", async () => {
    const res = await DELETE(new Request("http://localhost/api/courses/course-1"), context);

    expect(res.status).toBe(200);
    expect(deleteCourse).toHaveBeenCalledWith(session, "course-1");
  });

  it("maps ownership errors", async () => {
    updateCourse.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ subjectId: "chemistry" }), context);

    expect(res.status).toBe(403);
  });
});
