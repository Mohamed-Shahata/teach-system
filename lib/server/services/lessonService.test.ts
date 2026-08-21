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

const courseFindById = vi.fn();
vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { update: courseUpdate, findById: courseFindById },
}));

vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { incrementStats },
}));

const incrementSystemStats = vi.fn();
vi.mock("@/lib/server/repositories/systemStatsRepository", () => ({
  systemStatsRepository: { incrementStats: incrementSystemStats },
}));

const findByStudentAndCourse = vi.fn();
vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { findByStudentAndCourse },
}));

const hasActiveSubscriptionForCourse = vi.fn();
const getCourseForPreview = vi.fn();
vi.mock("@/lib/server/services/courseService", () => ({
  courseService: { getCourse, hasActiveSubscriptionForCourse, getCourseForPreview },
}));

const auditNotify = vi.fn();
vi.mock("@/lib/server/services/auditNotificationService", () => ({
  auditNotificationService: { notify: auditNotify },
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

  it("lists lessons for a student without a teacher ownership check", async () => {
    listByCourse.mockResolvedValue([{ id: "lesson-1" }]);

    const lessons = await lessonService.listLessonsForStudent(makeSession("student", "student-1"), "course-1");

    expect(getCourse).not.toHaveBeenCalled();
    expect(listByCourse).toHaveBeenCalledWith("course-1");
    expect(lessons).toEqual([{ id: "lesson-1" }]);
  });

  it("rejects listLessonsForStudent for a teacher session", async () => {
    await expect(
      lessonService.listLessonsForStudent(makeSession("teacher"), "course-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns a free-preview lesson to a student with no enrollment", async () => {
    const lesson = { id: "lesson-1", courseId: "course-1", isFreePreview: true };
    findById.mockResolvedValue(lesson);

    const result = await lessonService.getLessonForStudent(makeSession("student", "student-1"), "lesson-1");

    expect(findByStudentAndCourse).not.toHaveBeenCalled();
    expect(result).toBe(lesson);
  });

  it("gates a non-preview lesson on enrollment", async () => {
    const lesson = { id: "lesson-1", courseId: "course-1", isFreePreview: false };
    findById.mockResolvedValue(lesson);
    courseFindById.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", subjectId: "physics", stageId: "grade-9" });
    findByStudentAndCourse.mockResolvedValue({ studentId: "student-1", status: "active" });
    hasActiveSubscriptionForCourse.mockResolvedValue(false);

    const result = await lessonService.getLessonForStudent(makeSession("student", "student-1"), "lesson-1");

    expect(findByStudentAndCourse).toHaveBeenCalledWith("student-1", "course-1");
    expect(result).toBe(lesson);
  });

  it("gates a non-preview lesson on an active subscription when not enrolled (TASK-3204)", async () => {
    const lesson = { id: "lesson-1", courseId: "course-1", isFreePreview: false };
    findById.mockResolvedValue(lesson);
    courseFindById.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", subjectId: "physics", stageId: "grade-9" });
    findByStudentAndCourse.mockResolvedValue(null);
    hasActiveSubscriptionForCourse.mockResolvedValue(true);

    const result = await lessonService.getLessonForStudent(makeSession("student", "student-1"), "lesson-1");

    expect(result).toBe(lesson);
  });

  it("rejects a non-preview lesson for a non-enrolled, non-subscribed student", async () => {
    findById.mockResolvedValue({ id: "lesson-1", courseId: "course-1", isFreePreview: false });
    courseFindById.mockResolvedValue({ id: "course-1", teacherId: "teacher-1", subjectId: "physics", stageId: "grade-9" });
    findByStudentAndCourse.mockResolvedValue(null);
    hasActiveSubscriptionForCourse.mockResolvedValue(false);

    await expect(
      lessonService.getLessonForStudent(makeSession("student", "student-1"), "lesson-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError for a missing lesson in getLessonForStudent", async () => {
    findById.mockResolvedValue(null);

    await expect(
      lessonService.getLessonForStudent(makeSession("student", "student-1"), "lesson-1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError in getLessonForStudent when the lesson's course no longer exists", async () => {
    findById.mockResolvedValue({ id: "lesson-1", courseId: "course-1", isFreePreview: false });
    courseFindById.mockResolvedValue(null);

    await expect(
      lessonService.getLessonForStudent(makeSession("student", "student-1"), "lesson-1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  describe("listLessonsForCourseDetail (TASK-3204)", () => {
    const course = { id: "course-1", teacherId: "teacher-1", subjectId: "physics", stageId: "grade-9" };
    const lessons = [
      { id: "lesson-2", title: { en: "Two", ar: "٢" }, order: 1, isFreePreview: false },
      { id: "lesson-1", title: { en: "One", ar: "١" }, order: 0, isFreePreview: true },
    ];

    it("marks non-preview lessons locked for a non-enrolled, non-subscribed student", async () => {
      courseFindById.mockResolvedValue(course);
      listByCourse.mockResolvedValue(lessons);
      findByStudentAndCourse.mockResolvedValue(null);
      hasActiveSubscriptionForCourse.mockResolvedValue(false);

      const result = await lessonService.listLessonsForCourseDetail(makeSession("student", "student-1"), "course-1");

      expect(result).toEqual([
        { id: "lesson-1", title: { en: "One", ar: "١" }, order: 0, isFreePreview: true, locked: false },
        { id: "lesson-2", title: { en: "Two", ar: "٢" }, order: 1, isFreePreview: false, locked: true },
      ]);
      expect(result[0]).not.toHaveProperty("video");
    });

    it("unlocks every lesson for an enrolled student", async () => {
      courseFindById.mockResolvedValue(course);
      listByCourse.mockResolvedValue(lessons);
      findByStudentAndCourse.mockResolvedValue({ studentId: "student-1", status: "active" });
      hasActiveSubscriptionForCourse.mockResolvedValue(false);

      const result = await lessonService.listLessonsForCourseDetail(makeSession("student", "student-1"), "course-1");

      expect(result.every((lesson) => !lesson.locked)).toBe(true);
    });

    it("unlocks every lesson for a subscribed student", async () => {
      courseFindById.mockResolvedValue(course);
      listByCourse.mockResolvedValue(lessons);
      findByStudentAndCourse.mockResolvedValue(null);
      hasActiveSubscriptionForCourse.mockResolvedValue(true);

      const result = await lessonService.listLessonsForCourseDetail(makeSession("student", "student-1"), "course-1");

      expect(result.every((lesson) => !lesson.locked)).toBe(true);
    });

    it("unlocks every lesson for an admin session regardless of enrollment (TASK-3306)", async () => {
      courseFindById.mockResolvedValue(course);
      listByCourse.mockResolvedValue(lessons);
      findByStudentAndCourse.mockResolvedValue(null);
      hasActiveSubscriptionForCourse.mockResolvedValue(false);

      const result = await lessonService.listLessonsForCourseDetail(makeSession("admin"), "course-1");

      expect(result.every((lesson) => !lesson.locked)).toBe(true);
    });

    it("throws NotFoundError when the course doesn't exist", async () => {
      courseFindById.mockResolvedValue(null);

      await expect(
        lessonService.listLessonsForCourseDetail(makeSession("student", "student-1"), "course-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects a teacher session", async () => {
      await expect(
        lessonService.listLessonsForCourseDetail(makeSession("teacher"), "course-1"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe("listLessonsForCoursePreview (TASK-3104)", () => {
    const lessons = [
      { id: "lesson-2", title: { en: "Two", ar: "٢" }, order: 1, isFreePreview: false },
      { id: "lesson-1", title: { en: "One", ar: "١" }, order: 0, isFreePreview: true },
    ];

    it("reuses courseService.getCourseForPreview for the ownership check", async () => {
      getCourseForPreview.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });
      listByCourse.mockResolvedValue(lessons);

      await lessonService.listLessonsForCoursePreview(makeSession("teacher", "teacher-1"), "course-1");

      expect(getCourseForPreview).toHaveBeenCalledWith(makeSession("teacher", "teacher-1"), "course-1");
    });

    it("locks every non-free-preview lesson regardless of the teacher's own access", async () => {
      getCourseForPreview.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });
      listByCourse.mockResolvedValue(lessons);

      const result = await lessonService.listLessonsForCoursePreview(makeSession("teacher", "teacher-1"), "course-1");

      expect(result).toEqual([
        { id: "lesson-1", title: { en: "One", ar: "١" }, order: 0, isFreePreview: true, locked: false },
        { id: "lesson-2", title: { en: "Two", ar: "٢" }, order: 1, isFreePreview: false, locked: true },
      ]);
    });

    it("propagates ForbiddenError from getCourseForPreview for a non-owning teacher", async () => {
      getCourseForPreview.mockRejectedValue(new ForbiddenError());

      await expect(
        lessonService.listLessonsForCoursePreview(makeSession("teacher", "teacher-2"), "course-1"),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(listByCourse).not.toHaveBeenCalled();
    });
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

  it("defaults isFreePreview to false when not provided", async () => {
    await lessonService.createLesson(makeSession("teacher"), "course-1", {
      title: { en: "Intro", ar: "مقدمة" },
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ isFreePreview: false }));
  });

  it("persists isFreePreview: true when the teacher flags a lesson (TASK-3105)", async () => {
    await lessonService.createLesson(makeSession("teacher"), "course-1", {
      title: { en: "Intro", ar: "مقدمة" },
      isFreePreview: true,
    });

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ isFreePreview: true }));
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
    findById.mockResolvedValue({
      id: "lesson-1",
      courseId: "course-1",
      teacherId: "teacher-1",
      order: 0,
      title: { en: "Intro", ar: "مقدمة" },
    });

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
