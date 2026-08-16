import { beforeEach, describe, expect, it, vi } from "vitest";

const listByStudent = vi.fn();
const findByIdsProfiles = vi.fn();
const findByTeacherIdProfile = vi.fn();
const listSubjects = vi.fn();
const listPublishedCoursesByTeacher = vi.fn();

vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { listByStudent },
}));
vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { findByIds: findByIdsProfiles, findByTeacherId: findByTeacherIdProfile },
}));
vi.mock("@/lib/server/repositories/subjectRepository", () => ({
  subjectRepository: { list: listSubjects },
}));
vi.mock("@/lib/server/repositories/publicRepository", () => ({
  publicRepository: { listPublishedCoursesByTeacher },
}));

const { teacherDirectoryService } = await import("./teacherDirectoryService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "student-1") {
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

describe("teacherDirectoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSubjects.mockResolvedValue([{ id: "physics", name: { en: "Physics", ar: "فيزياء" }, createdAt: 1 }]);
  });

  describe("listMyTeachers", () => {
    it("groups the student's enrollments by teacher and joins profile/subject info", async () => {
      listByStudent.mockResolvedValue([
        enrollment({ id: "e1", teacherId: "teacher-1", courseId: "course-1" }),
        enrollment({ id: "e2", teacherId: "teacher-1", courseId: "course-2" }),
        enrollment({ id: "e3", teacherId: "teacher-2", courseId: "course-3" }),
      ]);
      findByIdsProfiles.mockResolvedValue(
        new Map([
          [
            "teacher-1",
            {
              teacherId: "teacher-1",
              slug: "yara",
              displayName: "Yara",
              isPublic: true,
              subjectIds: ["physics"],
              createdAt: 1,
            },
          ],
          [
            "teacher-2",
            { teacherId: "teacher-2", slug: "amir", displayName: "Amir", isPublic: true, createdAt: 1 },
          ],
        ]),
      );

      const result = await teacherDirectoryService.listMyTeachers(makeSession("student"));

      expect(listByStudent).toHaveBeenCalledWith("student-1");
      expect(result).toEqual([
        expect.objectContaining({ teacherId: "teacher-2", displayName: "Amir", courseCount: 1, slug: "amir" }),
        expect.objectContaining({
          teacherId: "teacher-1",
          displayName: "Yara",
          courseCount: 2,
          subjectName: { en: "Physics", ar: "فيزياء" },
          slug: "yara",
        }),
      ]);
    });

    it("excludes cancelled enrollments from the derived teacher set", async () => {
      listByStudent.mockResolvedValue([
        enrollment({ id: "e1", teacherId: "teacher-1", status: "cancelled" }),
      ]);
      findByIdsProfiles.mockResolvedValue(new Map());

      const result = await teacherDirectoryService.listMyTeachers(makeSession("student"));

      expect(result).toEqual([]);
    });

    it("falls back to the teacherId when no profile doc is found", async () => {
      listByStudent.mockResolvedValue([enrollment()]);
      findByIdsProfiles.mockResolvedValue(new Map());

      const [entry] = await teacherDirectoryService.listMyTeachers(makeSession("student"));

      expect(entry).toEqual(expect.objectContaining({ teacherId: "teacher-1", displayName: "teacher-1" }));
    });

    it("rejects non-student sessions", async () => {
      await expect(teacherDirectoryService.listMyTeachers(makeSession("teacher"))).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe("getTeacherCoursesForStudent", () => {
    it("flags courses the student is already enrolled in", async () => {
      listByStudent.mockResolvedValue([
        enrollment({ id: "e1", teacherId: "teacher-1", courseId: "course-1" }),
      ]);
      findByTeacherIdProfile.mockResolvedValue({
        teacherId: "teacher-1",
        slug: "yara",
        displayName: "Yara",
        isPublic: true,
        subjectIds: ["physics"],
        createdAt: 1,
      });
      listPublishedCoursesByTeacher.mockResolvedValue([
        { id: "course-1", teacherId: "teacher-1", slug: "c1", title: { en: "Course 1", ar: "كورس ١" } },
        { id: "course-2", teacherId: "teacher-1", slug: "c2", title: { en: "Course 2", ar: "كورس ٢" } },
      ]);

      const result = await teacherDirectoryService.getTeacherCoursesForStudent(
        makeSession("student"),
        "teacher-1",
      );

      expect(result.displayName).toBe("Yara");
      expect(result.subjectName).toEqual({ en: "Physics", ar: "فيزياء" });
      expect(result.courses).toEqual([
        expect.objectContaining({ courseId: "course-1", enrolled: true }),
        expect.objectContaining({ courseId: "course-2", enrolled: false }),
      ]);
    });

    it("treats a student with no non-cancelled enrollment for this teacher as not found", async () => {
      listByStudent.mockResolvedValue([
        enrollment({ id: "e1", teacherId: "teacher-1", status: "cancelled" }),
      ]);

      await expect(
        teacherDirectoryService.getTeacherCoursesForStudent(makeSession("student"), "teacher-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(findByTeacherIdProfile).not.toHaveBeenCalled();
    });

    it("rejects non-student sessions", async () => {
      await expect(
        teacherDirectoryService.getTeacherCoursesForStudent(makeSession("teacher"), "teacher-1"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
