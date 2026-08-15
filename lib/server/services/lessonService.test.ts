import { beforeEach, describe, expect, it, vi } from "vitest";

const listByCourse = vi.fn();
const findById = vi.fn();
const create = vi.fn();
const update = vi.fn();
const deleteLesson = vi.fn();
const reorder = vi.fn();

const courseUpdate = vi.fn();
const getCourse = vi.fn();
const incrementStats = vi.fn();

vi.mock("@/lib/server/repositories/lessonRepository", () => ({
  lessonRepository: { listByCourse, findById, create, update, delete: deleteLesson, reorder },
}));

vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { update: courseUpdate },
}));

vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { incrementStats },
}));

vi.mock("@/lib/server/services/courseService", () => ({
  courseService: { getCourse },
}));

const { lessonService } = await import("./lessonService");
const { ForbiddenError, NotFoundError, ValidationError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const course = { id: "course-1", teacherId: "teacher-1", lessonOrder: ["lesson-1", "lesson-2"] };

describe("lessonService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCourse.mockResolvedValue(course);
    listByCourse.mockResolvedValue([]);
    findById.mockResolvedValue(null);
    create.mockImplementation(async (lesson) => ({ id: "lesson-3", ...lesson }));
    update.mockImplementation(async (_session, id, patch) => ({ id, courseId: "course-1", order: 0, ...patch }));
    deleteLesson.mockResolvedValue(undefined);
    reorder.mockResolvedValue(undefined);
    courseUpdate.mockResolvedValue(undefined);
    incrementStats.mockResolvedValue(undefined);
  });

  it("lists lessons after verifying course ownership", async () => {
    const session = makeSession("teacher");
    listByCourse.mockResolvedValue([{ id: "lesson-1" }]);

    const lessons = await lessonService.listLessons(session, "course-1");

    expect(getCourse).toHaveBeenCalledWith(session, "course-1");
    expect(lessons).toEqual([{ id: "lesson-1" }]);
  });

  it("propagates the ownership error instead of listing", async () => {
    getCourse.mockRejectedValue(new ForbiddenError());

    await expect(lessonService.listLessons(makeSession("teacher"), "course-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(listByCourse).not.toHaveBeenCalled();
  });

  it("creates a lesson at the next order position and syncs course.lessonOrder + totalLessons", async () => {
    const session = makeSession("teacher");

    const lesson = await lessonService.createLesson(session, "course-1", {
      title: { en: "Intro", ar: "مقدمة" },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: "teacher-1", courseId: "course-1", order: 2, fileIds: [] }),
    );
    expect(courseUpdate).toHaveBeenCalledWith(session, "course-1", {
      lessonOrder: ["lesson-1", "lesson-2", "lesson-3"],
      updatedAt: expect.any(Number),
    });
    expect(incrementStats).toHaveBeenCalledWith("teacher-1", { totalLessons: 1 });
    expect(lesson.id).toBe("lesson-3");
  });

  it("throws NotFoundError when updating a missing lesson", async () => {
    await expect(
      lessonService.updateLesson(makeSession("teacher"), "missing", { title: { en: "x", ar: "y" } }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(getCourse).not.toHaveBeenCalled();
  });

  it("updates a lesson after verifying course ownership", async () => {
    const session = makeSession("teacher");
    findById.mockResolvedValue({ id: "lesson-1", courseId: "course-1", teacherId: "teacher-1", order: 0 });

    await lessonService.updateLesson(session, "lesson-1", { title: { en: "New", ar: "جديد" } });

    expect(getCourse).toHaveBeenCalledWith(session, "course-1");
    expect(update).toHaveBeenCalledWith(
      session,
      "lesson-1",
      expect.objectContaining({ title: { en: "New", ar: "جديد" } }),
    );
  });

  it("deletes a lesson, removes it from lessonOrder, and decrements totalLessons", async () => {
    const session = makeSession("teacher");
    findById.mockResolvedValue({ id: "lesson-1", courseId: "course-1", teacherId: "teacher-1", order: 0 });

    await lessonService.deleteLesson(session, "lesson-1");

    expect(deleteLesson).toHaveBeenCalledWith(session, "lesson-1");
    expect(courseUpdate).toHaveBeenCalledWith(session, "course-1", {
      lessonOrder: ["lesson-2"],
      updatedAt: expect.any(Number),
    });
    expect(incrementStats).toHaveBeenCalledWith("teacher-1", { totalLessons: -1 });
  });

  it("reorders lessons when the id set exactly matches the course's current lessons", async () => {
    const session = makeSession("teacher");
    listByCourse.mockResolvedValue([{ id: "lesson-2", order: 0 }, { id: "lesson-1", order: 1 }]);

    const result = await lessonService.reorderLessons(session, "course-1", ["lesson-2", "lesson-1"]);

    expect(reorder).toHaveBeenCalledWith(["lesson-2", "lesson-1"], expect.any(Number));
    expect(courseUpdate).toHaveBeenCalledWith(session, "course-1", {
      lessonOrder: ["lesson-2", "lesson-1"],
      updatedAt: expect.any(Number),
    });
    expect(result).toEqual([{ id: "lesson-2", order: 0 }, { id: "lesson-1", order: 1 }]);
  });

  it("rejects a reorder with a missing lesson id", async () => {
    await expect(lessonService.reorderLessons(makeSession("teacher"), "course-1", ["lesson-1"])).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(reorder).not.toHaveBeenCalled();
  });

  it("rejects a reorder with a duplicate lesson id", async () => {
    await expect(
      lessonService.reorderLessons(makeSession("teacher"), "course-1", ["lesson-1", "lesson-1"]),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(reorder).not.toHaveBeenCalled();
  });

  it("rejects a reorder containing an id not belonging to the course", async () => {
    await expect(
      lessonService.reorderLessons(makeSession("teacher"), "course-1", ["lesson-1", "lesson-2", "not-mine"]),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(reorder).not.toHaveBeenCalled();
  });
});
