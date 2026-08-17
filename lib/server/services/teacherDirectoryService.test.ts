import { beforeEach, describe, expect, it, vi } from "vitest";

const listByStudentEnrollments = vi.fn();
const listByStudentSubscriptions = vi.fn();
const listPublicProfiles = vi.fn();
const findByTeacherIdProfile = vi.fn();
const listSubjects = vi.fn();
const listPublishedCoursesByTeacher = vi.fn();

vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { listByStudent: listByStudentEnrollments },
}));
vi.mock("@/lib/server/repositories/subscriptionRepository", () => ({
  subscriptionRepository: { listByStudent: listByStudentSubscriptions },
}));
vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { listPublic: listPublicProfiles, findByTeacherId: findByTeacherIdProfile },
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

function subscription(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sub-1",
    studentId: "student-1",
    teacherId: "teacher-1",
    offeringId: "off-1",
    subjectId: "physics",
    stageId: "stage-1",
    status: "active",
    createdAt: 1000,
    ...overrides,
  };
}

function profile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    teacherId: "teacher-1",
    slug: "yara",
    displayName: "Yara",
    isPublic: true,
    subjectIds: ["physics"],
    createdAt: 1,
    stats: { totalStudents: 0, totalCourses: 0, totalPublishedCourses: 2, totalLessons: 0, totalEnrollments: 0 },
    ...overrides,
  };
}

describe("teacherDirectoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSubjects.mockResolvedValue([{ id: "physics", name: { en: "Physics", ar: "فيزياء" }, createdAt: 1 }]);
    listByStudentEnrollments.mockResolvedValue([]);
    listByStudentSubscriptions.mockResolvedValue([]);
  });

  describe("listTeacherDirectory", () => {
    it("returns every public teacher, sorted by name, flagged by active subscription", async () => {
      listPublicProfiles.mockResolvedValue([
        profile({ teacherId: "teacher-2", displayName: "Amir", subjectIds: undefined, stats: undefined }),
        profile({ teacherId: "teacher-1", displayName: "Yara" }),
      ]);
      listByStudentSubscriptions.mockResolvedValue([subscription({ teacherId: "teacher-1", status: "active" })]);

      const result = await teacherDirectoryService.listTeacherDirectory(makeSession("student"));

      expect(listByStudentSubscriptions).toHaveBeenCalledWith("student-1");
      expect(result).toEqual([
        expect.objectContaining({ teacherId: "teacher-2", displayName: "Amir", courseCount: 0, subscribed: false }),
        expect.objectContaining({
          teacherId: "teacher-1",
          displayName: "Yara",
          courseCount: 2,
          subjectName: { en: "Physics", ar: "فيزياء" },
          subscribed: true,
        }),
      ]);
    });

    it("does not flag a cancelled subscription as subscribed", async () => {
      listPublicProfiles.mockResolvedValue([profile()]);
      listByStudentSubscriptions.mockResolvedValue([subscription({ status: "cancelled" })]);

      const [entry] = await teacherDirectoryService.listTeacherDirectory(makeSession("student"));

      expect(entry.subscribed).toBe(false);
    });

    it("rejects non-student sessions", async () => {
      await expect(teacherDirectoryService.listTeacherDirectory(makeSession("teacher"))).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe("getTeacherAccountView", () => {
    it("returns profile details, subscription flag, and course enrollment flags", async () => {
      findByTeacherIdProfile.mockResolvedValue(
        profile({
          headline: { en: "Physics for everyone" },
          bio: { en: "10 years teaching physics." },
          yearsOfExperience: 10,
          specialization: "Mechanics",
          socialLinks: { website: "https://example.com" },
        }),
      );
      listPublishedCoursesByTeacher.mockResolvedValue([
        { id: "course-1", teacherId: "teacher-1", slug: "c1", title: { en: "Course 1", ar: "كورس ١" } },
        { id: "course-2", teacherId: "teacher-1", slug: "c2", title: { en: "Course 2", ar: "كورس ٢" } },
      ]);
      listByStudentEnrollments.mockResolvedValue([enrollment({ courseId: "course-1" })]);
      listByStudentSubscriptions.mockResolvedValue([subscription({ status: "active" })]);

      const result = await teacherDirectoryService.getTeacherAccountView(makeSession("student"), "teacher-1");

      expect(result.displayName).toBe("Yara");
      expect(result.subscribed).toBe(true);
      expect(result.headline).toEqual({ en: "Physics for everyone" });
      expect(result.yearsOfExperience).toBe(10);
      expect(result.courses).toEqual([
        expect.objectContaining({ courseId: "course-1", enrolled: true }),
        expect.objectContaining({ courseId: "course-2", enrolled: false }),
      ]);
    });

    it("is not gated by any prior enrollment or subscription", async () => {
      findByTeacherIdProfile.mockResolvedValue(profile());
      listPublishedCoursesByTeacher.mockResolvedValue([]);

      await expect(
        teacherDirectoryService.getTeacherAccountView(makeSession("student"), "teacher-1"),
      ).resolves.toEqual(expect.objectContaining({ teacherId: "teacher-1", subscribed: false, courses: [] }));
    });

    it("treats a non-public profile as not found", async () => {
      findByTeacherIdProfile.mockResolvedValue(profile({ isPublic: false }));

      await expect(
        teacherDirectoryService.getTeacherAccountView(makeSession("student"), "teacher-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("treats a missing profile as not found", async () => {
      findByTeacherIdProfile.mockResolvedValue(null);

      await expect(
        teacherDirectoryService.getTeacherAccountView(makeSession("student"), "teacher-1"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects non-student sessions", async () => {
      await expect(
        teacherDirectoryService.getTeacherAccountView(makeSession("teacher"), "teacher-1"),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
