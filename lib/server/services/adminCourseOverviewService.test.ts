import { beforeEach, describe, expect, it, vi } from "vitest";

const listCourses = vi.fn();
const listByTeacher = vi.fn();
const findByIdsProfiles = vi.fn();
const listSubjects = vi.fn();
const listStages = vi.fn();

vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { list: listCourses },
}));
vi.mock("@/lib/server/repositories/enrollmentRepository", () => ({
  enrollmentRepository: { listByTeacher },
}));
vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { findByIds: findByIdsProfiles },
}));
vi.mock("@/lib/server/repositories/subjectRepository", () => ({
  subjectRepository: { list: listSubjects },
}));
vi.mock("@/lib/server/repositories/educationStageRepository", () => ({
  educationStageRepository: { list: listStages },
}));

const { adminCourseOverviewService } = await import("./adminCourseOverviewService");
const { ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "admin", uid = "admin-1") {
  return { uid, email: `${uid}@example.com`, role };
}

function course(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "course-1",
    teacherId: "teacher-1",
    subjectId: "physics",
    stageId: "stage-1",
    slug: "c1",
    title: { en: "Course 1", ar: "كورس ١" },
    status: "published",
    lessonOrder: [],
    enrollmentType: "paid",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("adminCourseOverviewService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSubjects.mockResolvedValue([{ id: "physics", name: { en: "Physics", ar: "فيزياء" }, createdAt: 1 }]);
    listStages.mockResolvedValue([{ id: "stage-1", order: 1, name: { en: "Stage 1", ar: "مرحلة ١" }, category: "primary" }]);
  });

  describe("listCourses", () => {
    it("joins courses with teacher name, subject/stage names, and enrollment counts", async () => {
      listCourses.mockResolvedValue([
        course({ id: "course-1", teacherId: "teacher-1" }),
        course({ id: "course-2", teacherId: "teacher-2", status: "draft" }),
      ]);
      listByTeacher.mockResolvedValue([
        { courseId: "course-1", teacherId: "teacher-1" },
        { courseId: "course-1", teacherId: "teacher-1" },
      ]);
      findByIdsProfiles.mockResolvedValue(
        new Map([
          ["teacher-1", { teacherId: "teacher-1", slug: "yara", displayName: "Yara", isPublic: true, createdAt: 1 }],
          ["teacher-2", { teacherId: "teacher-2", slug: "amir", displayName: "Amir", isPublic: true, createdAt: 1 }],
        ]),
      );

      const result = await adminCourseOverviewService.listCourses(makeSession("admin"));

      expect(listCourses).toHaveBeenCalledWith(makeSession("admin"));
      expect(result).toEqual([
        expect.objectContaining({
          courseId: "course-1",
          teacherName: "Yara",
          subjectName: { en: "Physics", ar: "فيزياء" },
          stageName: { en: "Stage 1", ar: "مرحلة ١" },
          enrollmentCount: 2,
        }),
        expect.objectContaining({ courseId: "course-2", teacherName: "Amir", status: "draft", enrollmentCount: 0 }),
      ]);
    });

    it("falls back to the teacherId when no profile doc is found", async () => {
      listCourses.mockResolvedValue([course()]);
      listByTeacher.mockResolvedValue([]);
      findByIdsProfiles.mockResolvedValue(new Map());

      const [entry] = await adminCourseOverviewService.listCourses(makeSession("admin"));

      expect(entry).toEqual(expect.objectContaining({ teacherId: "teacher-1", teacherName: "teacher-1" }));
    });

    it("rejects non-admin sessions", async () => {
      await expect(adminCourseOverviewService.listCourses(makeSession("teacher"))).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });
});
