import { beforeEach, describe, expect, it, vi } from "vitest";

const findLessonById = vi.fn();
vi.mock("@/lib/server/repositories/lessonRepository", () => ({
  lessonRepository: { findById: findLessonById },
}));

const findByStudentAndCourse = vi.fn();
vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { findByStudentAndCourse },
}));

const findByStudentAndLesson = vi.fn();
const upsert = vi.fn();
vi.mock("@/lib/server/repositories/lessonProgressRepository", () => ({
  lessonProgressRepository: { findByStudentAndLesson, upsert },
}));

const recalculateWatchProgress = vi.fn();
vi.mock("@/lib/server/services/enrollmentService", () => ({
  enrollmentService: { recalculateWatchProgress },
}));

const { lessonProgressService } = await import("./lessonProgressService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "student-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const lesson = { id: "lesson-1", teacherId: "teacher-1", courseId: "course-1" };
const activeEnrollment = {
  id: "student-1_course-1",
  studentId: "student-1",
  courseId: "course-1",
  status: "active" as const,
};

describe("lessonProgressService.reportProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findLessonById.mockResolvedValue(lesson);
    findByStudentAndCourse.mockResolvedValue(activeEnrollment);
    findByStudentAndLesson.mockResolvedValue(null);
    upsert.mockImplementation(async (progress) => ({ id: "student-1_lesson-1", ...progress }));
    recalculateWatchProgress.mockResolvedValue(undefined);
  });

  it("rejects a non-student caller", async () => {
    await expect(
      lessonProgressService.reportProgress(makeSession("teacher", "teacher-1"), "lesson-1", {
        currentTimeSeconds: 10,
        durationSeconds: 100,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError for a missing lesson", async () => {
    findLessonById.mockResolvedValue(null);
    await expect(
      lessonProgressService.reportProgress(makeSession("student"), "lesson-1", {
        currentTimeSeconds: 10,
        durationSeconds: 100,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("rejects a student who isn't enrolled in the lesson's course", async () => {
    findByStudentAndCourse.mockResolvedValue(null);
    await expect(
      lessonProgressService.reportProgress(makeSession("student"), "lesson-1", {
        currentTimeSeconds: 10,
        durationSeconds: 100,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("upserts watchedSeconds/lastPositionSeconds from a first report", async () => {
    const progress = await lessonProgressService.reportProgress(makeSession("student"), "lesson-1", {
      currentTimeSeconds: 30,
      durationSeconds: 300,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: "student-1",
        lessonId: "lesson-1",
        watchedSeconds: 30,
        videoDurationSeconds: 300,
        lastPositionSeconds: 30,
      }),
    );
    expect(recalculateWatchProgress).toHaveBeenCalledWith("student-1", "course-1");
    expect(progress.watchedSeconds).toBe(30);
  });

  it("keeps watchedSeconds at the furthest point reached, even after a rewind", async () => {
    findByStudentAndLesson.mockResolvedValue({
      id: "student-1_lesson-1",
      studentId: "student-1",
      lessonId: "lesson-1",
      watchedSeconds: 120,
      videoDurationSeconds: 300,
      lastPositionSeconds: 120,
      updatedAt: 1000,
    });

    const progress = await lessonProgressService.reportProgress(makeSession("student"), "lesson-1", {
      currentTimeSeconds: 40,
      durationSeconds: 300,
    });

    expect(progress.watchedSeconds).toBe(120);
    expect(progress.lastPositionSeconds).toBe(40);
  });

  it("rejects an admin caller too — this is a student-only action, like markLessonComplete", async () => {
    await expect(
      lessonProgressService.reportProgress(makeSession("admin", "admin-1"), "lesson-1", {
        currentTimeSeconds: 10,
        durationSeconds: 100,
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
