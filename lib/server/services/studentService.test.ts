import { beforeEach, describe, expect, it, vi } from "vitest";

const listByTeacher = vi.fn();
const findByIdsUsers = vi.fn();
const findByIdUser = vi.fn();
const findByIdsCourses = vi.fn();
const findByIdCourse = vi.fn();
const listByCourseLessons = vi.fn();
const listByStudentsForLessons = vi.fn();

vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { listByTeacher },
}));
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findByIds: findByIdsUsers, findById: findByIdUser },
}));
vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { findByIds: findByIdsCourses, findById: findByIdCourse },
}));
vi.mock("@/lib/server/repositories/lessonRepository", () => ({
  lessonRepository: { listByCourse: listByCourseLessons },
}));
vi.mock("@/lib/server/repositories/lessonProgressRepository", () => ({
  lessonProgressRepository: { listByStudentsForLessons },
}));
vi.mock("@/lib/server/services/enrollmentService", () => ({
  watchPercent: (videoDurationSeconds: number, watchedSeconds: number) =>
    videoDurationSeconds > 0 ? Math.min(100, Math.round((watchedSeconds / videoDurationSeconds) * 100)) : 0,
}));

const { studentService } = await import("./studentService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

function enrollment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "enr-1",
    studentId: "student-1",
    courseId: "course-1",
    teacherId: "teacher-1",
    status: "active",
    enrollmentDate: 1000,
    progress: { completedLessonIds: [], percent: 0 },
    ...overrides,
  };
}

describe("studentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listStudents", () => {
    it("groups the teacher's enrollments by student and joins user info", async () => {
      const session = makeSession("teacher");
      listByTeacher.mockResolvedValue([
        enrollment({ id: "e1", studentId: "student-1", progress: { completedLessonIds: [], percent: 40 } }),
        enrollment({ id: "e2", studentId: "student-1", courseId: "course-2", progress: { completedLessonIds: [], percent: 60 } }),
        enrollment({ id: "e3", studentId: "student-2", progress: { completedLessonIds: [], percent: 0 } }),
      ]);
      findByIdsUsers.mockResolvedValue(
        new Map([
          ["student-1", { uid: "student-1", displayName: "Amira", email: "amira@example.com", role: "student", createdBy: { uid: "teacher-1", role: "teacher" }, createdAt: 1 }],
          ["student-2", { uid: "student-2", displayName: "Zaid", email: "zaid@example.com", role: "student", createdBy: { uid: "teacher-1", role: "teacher" }, createdAt: 1 }],
        ]),
      );

      const result = await studentService.listStudents(session);

      expect(listByTeacher).toHaveBeenCalledWith(session);
      expect(result).toEqual([
        expect.objectContaining({ uid: "student-1", displayName: "Amira", courseCount: 2, averageProgress: 50 }),
        expect.objectContaining({ uid: "student-2", displayName: "Zaid", courseCount: 1, averageProgress: 0 }),
      ]);
    });

    it("falls back to the uid when no user doc is found", async () => {
      listByTeacher.mockResolvedValue([enrollment()]);
      findByIdsUsers.mockResolvedValue(new Map());

      const [summary] = await studentService.listStudents(makeSession("teacher"));

      expect(summary).toEqual(
        expect.objectContaining({ uid: "student-1", displayName: "student-1", email: "" }),
      );
    });

    it("rejects non-teacher/admin sessions", async () => {
      await expect(studentService.listStudents(makeSession("student"))).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("TASK-2403: narrows an Admin's otherwise-unscoped read to one teacherId", async () => {
      listByTeacher.mockResolvedValue([
        enrollment({ id: "e1", studentId: "student-1", teacherId: "teacher-1" }),
        enrollment({ id: "e2", studentId: "student-2", teacherId: "teacher-2" }),
      ]);
      findByIdsUsers.mockResolvedValue(
        new Map([
          ["student-1", { uid: "student-1", displayName: "Amira", email: "amira@example.com", role: "student", createdBy: { uid: "teacher-1", role: "teacher" }, createdAt: 1 }],
        ]),
      );

      const result = await studentService.listStudents(makeSession("admin", "admin-1"), "teacher-1");

      expect(result).toEqual([expect.objectContaining({ uid: "student-1", displayName: "Amira" })]);
    });

    it("TASK-2403: ignores teacherId for a teacher session (already scoped by scopeToTeacher)", async () => {
      listByTeacher.mockResolvedValue([enrollment({ id: "e1", studentId: "student-1", teacherId: "teacher-1" })]);
      findByIdsUsers.mockResolvedValue(new Map());

      const result = await studentService.listStudents(makeSession("teacher"), "some-other-teacher");

      expect(result).toEqual([expect.objectContaining({ uid: "student-1" })]);
    });
  });

  describe("getStudentDetail", () => {
    it("returns enrolled courses with progress, joined with course titles", async () => {
      const session = makeSession("teacher");
      listByTeacher.mockResolvedValue([
        enrollment({ id: "e1", enrollmentDate: 1000 }),
        enrollment({ id: "e2", courseId: "course-2", enrollmentDate: 2000 }),
        enrollment({ id: "e3", studentId: "other-student" }),
      ]);
      findByIdUser.mockResolvedValue({
        uid: "student-1",
        displayName: "Amira",
        email: "amira@example.com",
        role: "student",
        createdBy: { uid: "teacher-1", role: "teacher" },
        createdAt: 1,
      });
      findByIdsCourses.mockResolvedValue(
        new Map([
          ["course-1", { id: "course-1", title: { en: "Physics", ar: "فيزياء" } }],
          ["course-2", { id: "course-2", title: { en: "Chemistry", ar: "كيمياء" } }],
        ]),
      );

      const detail = await studentService.getStudentDetail(session, "student-1");

      expect(detail.displayName).toBe("Amira");
      expect(detail.courses).toHaveLength(2);
      // sorted by enrollmentDate desc
      expect(detail.courses[0]).toEqual(
        expect.objectContaining({ courseId: "course-2", courseTitle: { en: "Chemistry", ar: "كيمياء" } }),
      );
    });

    it("throws NotFoundError when the student has no enrollment with this teacher", async () => {
      listByTeacher.mockResolvedValue([enrollment({ studentId: "someone-else" })]);

      await expect(studentService.getStudentDetail(makeSession("teacher"), "student-1")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("rejects non-teacher/admin sessions", async () => {
      await expect(studentService.getStudentDetail(makeSession("student"), "student-1")).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it("TASK-2403: an Admin scoped to one teacherId doesn't see the student's enrollment with another teacher", async () => {
      listByTeacher.mockResolvedValue([
        enrollment({ id: "e1", studentId: "student-1", teacherId: "teacher-2", enrollmentDate: 1000 }),
      ]);

      await expect(
        studentService.getStudentDetail(makeSession("admin", "admin-1"), "student-1", "teacher-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getCourseStudentsProgress", () => {
    function lesson(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        id: "lesson-1",
        teacherId: "teacher-1",
        courseId: "course-1",
        title: { en: "Intro", ar: "مقدمة" },
        order: 0,
        fileIds: [],
        createdAt: 1,
        updatedAt: 1,
        ...overrides,
      };
    }

    it("TASK-2504: returns per-lesson watch percentage, using the completed override where set", async () => {
      const session = makeSession("teacher");
      findByIdCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });
      listByCourseLessons.mockResolvedValue([
        lesson({ id: "lesson-1" }),
        lesson({ id: "lesson-2", title: { en: "Part 2", ar: "الجزء 2" } }),
      ]);
      listByTeacher.mockResolvedValue([
        enrollment({
          studentId: "student-1",
          progress: { completedLessonIds: ["lesson-1"], percent: 75 },
        }),
      ]);
      findByIdsUsers.mockResolvedValue(
        new Map([["student-1", { uid: "student-1", displayName: "Amira", email: "amira@example.com", role: "student", createdBy: { uid: "teacher-1", role: "teacher" }, createdAt: 1 }]]),
      );
      listByStudentsForLessons.mockResolvedValue([
        { id: "student-1_lesson-2", studentId: "student-1", lessonId: "lesson-2", watchedSeconds: 30, videoDurationSeconds: 60, lastPositionSeconds: 30, updatedAt: 1 },
      ]);

      const result = await studentService.getCourseStudentsProgress(session, "course-1");

      expect(listByTeacher).toHaveBeenCalledWith(session, "course-1");
      // TASK-3603: one batched call across every enrolled student, not
      // one `listByStudentForLessons`-style call per student (the old
      // N+1 flagged by TASK-3601).
      expect(listByStudentsForLessons).toHaveBeenCalledTimes(1);
      expect(listByStudentsForLessons).toHaveBeenCalledWith(["student-1"], ["lesson-1", "lesson-2"]);
      expect(result).toEqual([
        {
          studentId: "student-1",
          displayName: "Amira",
          email: "amira@example.com",
          overallPercent: 75,
          lessons: [
            { lessonId: "lesson-1", lessonTitle: { en: "Intro", ar: "مقدمة" }, completed: true, watchPercent: 100 },
            { lessonId: "lesson-2", lessonTitle: { en: "Part 2", ar: "الجزء 2" }, completed: false, watchPercent: 50 },
          ],
        },
      ]);
    });

    it("TASK-3603: issues exactly one lessonProgress read regardless of enrolled student count", async () => {
      findByIdCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });
      listByCourseLessons.mockResolvedValue([lesson({ id: "lesson-1" })]);
      listByTeacher.mockResolvedValue([
        enrollment({ studentId: "student-1", progress: { completedLessonIds: [], percent: 0 } }),
        enrollment({ studentId: "student-2", progress: { completedLessonIds: [], percent: 0 } }),
        enrollment({ studentId: "student-3", progress: { completedLessonIds: [], percent: 0 } }),
      ]);
      findByIdsUsers.mockResolvedValue(new Map());
      listByStudentsForLessons.mockResolvedValue([]);

      await studentService.getCourseStudentsProgress(makeSession("teacher"), "course-1");

      expect(listByStudentsForLessons).toHaveBeenCalledTimes(1);
      expect(listByStudentsForLessons).toHaveBeenCalledWith(["student-1", "student-2", "student-3"], ["lesson-1"]);
    });

    it("TASK-2504: returns an empty list when the course has no enrollments, without fetching lesson progress", async () => {
      findByIdCourse.mockResolvedValue({ id: "course-1", teacherId: "teacher-1" });
      listByCourseLessons.mockResolvedValue([lesson()]);
      listByTeacher.mockResolvedValue([]);

      const result = await studentService.getCourseStudentsProgress(makeSession("teacher"), "course-1");

      expect(result).toEqual([]);
      expect(listByStudentsForLessons).not.toHaveBeenCalled();
    });

    it("TASK-2504: throws NotFoundError for a course that doesn't exist", async () => {
      findByIdCourse.mockResolvedValue(null);

      await expect(
        studentService.getCourseStudentsProgress(makeSession("teacher"), "missing-course"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("TASK-2504: rejects a teacher who doesn't own the course", async () => {
      findByIdCourse.mockResolvedValue({ id: "course-1", teacherId: "other-teacher" });

      await expect(
        studentService.getCourseStudentsProgress(makeSession("teacher"), "course-1"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects non-teacher sessions", async () => {
      await expect(
        studentService.getCourseStudentsProgress(makeSession("student"), "course-1"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
