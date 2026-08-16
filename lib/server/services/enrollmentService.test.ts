import { beforeEach, describe, expect, it, vi } from "vitest";

const findByStudentAndCourse = vi.fn();
const listByStudent = vi.fn();
const listByTeacher = vi.fn();
const create = vi.fn();
const findById = vi.fn();
const updateProgress = vi.fn();

vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: {
    findByStudentAndCourse,
    listByStudent,
    listByTeacher,
    create,
    findById,
    updateProgress,
  },
}));

const findCourseById = vi.fn();
vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { findById: findCourseById },
}));

const incrementStats = vi.fn();
vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { incrementStats },
}));

const incrementSystemStats = vi.fn();
vi.mock("@/lib/server/repositories/systemStatsRepository", () => ({
  systemStatsRepository: { incrementStats: incrementSystemStats },
}));

const { enrollmentService } = await import("./enrollmentService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "uid-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const activeEnrollment = {
  id: "student-1_course-1",
  studentId: "student-1",
  courseId: "course-1",
  teacherId: "teacher-1",
  status: "active" as const,
  enrollmentDate: 1000,
  progress: { completedLessonIds: [], percent: 0 },
};

describe("enrollmentService.createEnrollment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByStudentAndCourse.mockResolvedValue(null);
    create.mockImplementation(async (enrollment) => ({ id: "student-1_course-1", ...enrollment }));
    incrementStats.mockResolvedValue(undefined);
  });

  it("creates a new active enrollment and increments totalEnrollments", async () => {
    const enrollment = await enrollmentService.createEnrollment({
      studentId: "student-1",
      courseId: "course-1",
      teacherId: "teacher-1",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: "student-1", courseId: "course-1", status: "active" }),
    );
    expect(incrementStats).toHaveBeenCalledWith("teacher-1", { totalEnrollments: 1 });
    expect(enrollment.status).toBe("active");
  });

  it("is idempotent — returns the existing enrollment instead of creating a duplicate", async () => {
    findByStudentAndCourse.mockResolvedValue(activeEnrollment);

    const enrollment = await enrollmentService.createEnrollment({
      studentId: "student-1",
      courseId: "course-1",
      teacherId: "teacher-1",
    });

    expect(create).not.toHaveBeenCalled();
    expect(enrollment).toEqual(activeEnrollment);
  });

  it("recovers from a create() race by returning what's already there", async () => {
    create.mockRejectedValue({ code: 6 });
    findByStudentAndCourse
      .mockResolvedValueOnce(null) // first check: nothing yet
      .mockResolvedValueOnce(activeEnrollment); // after the race, it's there

    const enrollment = await enrollmentService.createEnrollment({
      studentId: "student-1",
      courseId: "course-1",
      teacherId: "teacher-1",
    });

    expect(enrollment).toEqual(activeEnrollment);
  });
});

describe("enrollmentService.markLessonComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue(activeEnrollment);
    findCourseById.mockResolvedValue({ id: "course-1", lessonOrder: ["lesson-1", "lesson-2"] });
    updateProgress.mockImplementation(async (id, progress, status) => ({ ...activeEnrollment, id, progress, status }));
  });

  it("rejects a non-owning student", async () => {
    await expect(
      enrollmentService.markLessonComplete(makeSession("student", "someone-else"), "student-1_course-1", "lesson-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("adds the lesson and recomputes percent from the course's lesson count", async () => {
    const session = makeSession("student", "student-1");
    const updated = await enrollmentService.markLessonComplete(session, "student-1_course-1", "lesson-1");

    expect(updateProgress).toHaveBeenCalledWith(
      "student-1_course-1",
      { completedLessonIds: ["lesson-1"], percent: 50 },
      "active",
    );
    expect(updated.progress.percent).toBe(50);
  });

  it("doesn't duplicate an already-completed lesson", async () => {
    findById.mockResolvedValue({ ...activeEnrollment, progress: { completedLessonIds: ["lesson-1"], percent: 50 } });
    const session = makeSession("student", "student-1");
    await enrollmentService.markLessonComplete(session, "student-1_course-1", "lesson-1");

    expect(updateProgress).toHaveBeenCalledWith(
      "student-1_course-1",
      { completedLessonIds: ["lesson-1"], percent: 50 },
      "active",
    );
  });

  it("flips status to completed once every lesson is done", async () => {
    findById.mockResolvedValue({ ...activeEnrollment, progress: { completedLessonIds: ["lesson-1"], percent: 50 } });
    const session = makeSession("student", "student-1");
    const updated = await enrollmentService.markLessonComplete(session, "student-1_course-1", "lesson-2");

    expect(updateProgress).toHaveBeenCalledWith(
      "student-1_course-1",
      { completedLessonIds: ["lesson-1", "lesson-2"], percent: 100 },
      "completed",
    );
    expect(updated.status).toBe("completed");
  });

  it("throws NotFoundError for a missing enrollment", async () => {
    findById.mockResolvedValue(null);
    await expect(
      enrollmentService.markLessonComplete(makeSession("student", "student-1"), "nope", "lesson-1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("enrollmentService.listForTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listByTeacher.mockResolvedValue([activeEnrollment]);
  });

  it("rejects a student session", async () => {
    await expect(enrollmentService.listForTeacher(makeSession("student"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns the teacher's scoped enrollments", async () => {
    const session = makeSession("teacher", "teacher-1");
    await expect(enrollmentService.listForTeacher(session)).resolves.toEqual([activeEnrollment]);
    expect(listByTeacher).toHaveBeenCalledWith(session, undefined);
  });
});
