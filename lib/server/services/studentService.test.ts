import { beforeEach, describe, expect, it, vi } from "vitest";

const listByTeacher = vi.fn();
const findByIdsUsers = vi.fn();
const findByIdUser = vi.fn();
const findByIdsCourses = vi.fn();

vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { listByTeacher },
}));
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findByIds: findByIdsUsers, findById: findByIdUser },
}));
vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { findByIds: findByIdsCourses },
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
  });
});
