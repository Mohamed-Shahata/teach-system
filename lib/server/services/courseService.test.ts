import { beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.fn();
const findById = vi.fn();
const findByTeacherAndSlug = vi.fn();
const create = vi.fn();
const update = vi.fn();
const deleteCourse = vi.fn();
const incrementStats = vi.fn();

vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { list, findById, findByTeacherAndSlug, create, update, delete: deleteCourse },
}));

vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { incrementStats },
}));

const { courseService } = await import("./courseService");
const { ConflictError, ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const createInput = {
  subjectId: "physics",
  stageId: "secondary-3",
  title: { en: "Physics Basics", ar: "أساسيات الفيزياء" },
  enrollmentType: "paid" as const,
  price: 250,
  currency: "EGP",
};

describe("courseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    findById.mockResolvedValue(null);
    findByTeacherAndSlug.mockResolvedValue(null);
    create.mockImplementation(async (course) => ({ id: "course-1", ...course }));
    update.mockImplementation(async (_session, id, patch) => ({ id, teacherId: "teacher-1", status: "draft", ...patch }));
    deleteCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", status: "draft" });
    incrementStats.mockResolvedValue(undefined);
  });

  it("creates a draft course with a per-teacher slug and increments totalCourses", async () => {
    const session = makeSession("teacher", "teacher-7");

    const course = await courseService.createCourse(session, createInput);

    expect(findByTeacherAndSlug).toHaveBeenCalledWith("teacher-7", "physics-basics");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        teacherId: "teacher-7",
        slug: "physics-basics",
        status: "draft",
        lessonOrder: [],
      }),
    );
    expect(incrementStats).toHaveBeenCalledWith("teacher-7", { totalCourses: 1 });
    expect(course.id).toBe("course-1");
  });

  it("rejects slug collisions for the same teacher", async () => {
    findByTeacherAndSlug.mockResolvedValue({ id: "existing-course" });

    await expect(courseService.createCourse(makeSession("teacher"), createInput)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("updates the slug when the title changes and keeps it unique", async () => {
    findById.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", status: "draft" });

    await courseService.updateCourse(makeSession("teacher"), "course-1", {
      title: { en: "Advanced Physics", ar: "فيزياء متقدمة" },
    });

    expect(findByTeacherAndSlug).toHaveBeenCalledWith("teacher-1", "advanced-physics");
    expect(update).toHaveBeenCalledWith(
      expect.any(Object),
      "course-1",
      expect.objectContaining({ slug: "advanced-physics" }),
    );
  });

  it("throws NotFoundError when updating a missing course", async () => {
    await expect(courseService.updateCourse(makeSession("teacher"), "missing", { subjectId: "math" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("increments published counter only on draft to published transition", async () => {
    findById.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", status: "draft" });

    await courseService.publishCourse(makeSession("teacher"), "course-1");

    expect(incrementStats).toHaveBeenCalledWith("teacher-1", { totalPublishedCourses: 1 });
  });

  it("decrements published counter only when unpublishing a published course", async () => {
    findById.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", status: "published" });

    await courseService.unpublishCourse(makeSession("teacher"), "course-1");

    expect(incrementStats).toHaveBeenCalledWith("teacher-1", { totalPublishedCourses: -1 });
  });

  it("decrements course counters on delete", async () => {
    deleteCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", status: "published" });

    await courseService.deleteCourse(makeSession("teacher"), "course-1");

    expect(incrementStats).toHaveBeenCalledWith("teacher-1", {
      totalCourses: -1,
      totalPublishedCourses: -1,
    });
  });

  it("returns a course the teacher owns", async () => {
    findById.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", status: "draft" });

    const course = await courseService.getCourse(makeSession("teacher", "teacher-1"), "course-1");

    expect(course).toEqual({ id: "course-1", teacherId: "teacher-1", status: "draft" });
  });

  it("throws NotFoundError when getting a missing course", async () => {
    await expect(courseService.getCourse(makeSession("teacher"), "missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ForbiddenError when getting another teacher's course", async () => {
    findById.mockResolvedValue({ id: "course-1", teacherId: "teacher-2", status: "draft" });

    await expect(courseService.getCourse(makeSession("teacher", "teacher-1"), "course-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("rejects non-teacher sessions", async () => {
    await expect(courseService.listCourses(makeSession("student"))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(courseService.createCourse(makeSession("admin"), createInput)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
