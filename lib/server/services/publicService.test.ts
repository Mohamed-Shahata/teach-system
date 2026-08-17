import { beforeEach, describe, expect, it, vi } from "vitest";

const findTeacherProfileBySlug = vi.fn();
const listPublishedCoursesByTeacher = vi.fn();
const findPublishedCourseBySlug = vi.fn();
const findTeacherProfile = vi.fn();
const getPublicSummary = vi.fn();

vi.mock("@/lib/server/repositories/publicRepository", () => ({
  publicRepository: {
    findTeacherProfileBySlug,
    listPublishedCoursesByTeacher,
    findPublishedCourseBySlug,
    findTeacherProfile,
  },
}));

// publicService.getTeacherPageBySlug also calls reviewService (TASK-2703's
// `reviews` field). reviewService itself pulls in enrollmentRepository ->
// firebaseAdmin, which throws on a real init in this env-var-less test
// environment — so it's mocked here the same way every other dependency
// of the service under test is, rather than left to hit the real module.
vi.mock("@/lib/server/services/reviewService", () => ({
  reviewService: { getPublicSummary },
}));

const { publicService } = await import("./publicService");
const { NotFoundError } = await import("@/lib/errors");

describe("publicService.getTeacherPageBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the profile with its published courses and review summary", async () => {
    findTeacherProfileBySlug.mockResolvedValue({ teacherId: "teacher-1", slug: "mona", displayName: "Mona" });
    listPublishedCoursesByTeacher.mockResolvedValue([
      { id: "course-1", teacherId: "teacher-1", slug: "algebra-1", title: { en: "Algebra I", ar: "الجبر ١" } },
    ]);
    getPublicSummary.mockResolvedValue({ averageRating: 4.5, reviewCount: 2, reviews: [] });

    await expect(publicService.getTeacherPageBySlug("mona")).resolves.toEqual({
      profile: { teacherId: "teacher-1", slug: "mona", displayName: "Mona" },
      courses: [
        { id: "course-1", teacherId: "teacher-1", slug: "algebra-1", title: { en: "Algebra I", ar: "الجبر ١" } },
      ],
      reviews: { averageRating: 4.5, reviewCount: 2, reviews: [] },
    });
    expect(listPublishedCoursesByTeacher).toHaveBeenCalledWith("teacher-1");
    expect(getPublicSummary).toHaveBeenCalledWith("teacher-1");
  });

  it("throws NotFoundError when the slug doesn't resolve to a public profile", async () => {
    findTeacherProfileBySlug.mockResolvedValue(null);

    await expect(publicService.getTeacherPageBySlug("missing")).rejects.toBeInstanceOf(NotFoundError);
    expect(listPublishedCoursesByTeacher).not.toHaveBeenCalled();
    expect(getPublicSummary).not.toHaveBeenCalled();
  });
});

describe("publicService.getCoursePageBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the course with its teacher's public profile", async () => {
    findPublishedCourseBySlug.mockResolvedValue({
      id: "course-1",
      teacherId: "teacher-1",
      slug: "algebra-1",
      title: { en: "Algebra I", ar: "الجبر ١" },
    });
    findTeacherProfile.mockResolvedValue({ teacherId: "teacher-1", slug: "mona", displayName: "Mona" });

    await expect(publicService.getCoursePageBySlug("algebra-1")).resolves.toEqual({
      course: { id: "course-1", teacherId: "teacher-1", slug: "algebra-1", title: { en: "Algebra I", ar: "الجبر ١" } },
      teacher: { teacherId: "teacher-1", slug: "mona", displayName: "Mona" },
    });
    expect(findTeacherProfile).toHaveBeenCalledWith("teacher-1");
  });

  it("returns teacher: null when the owning teacher isn't public, without erroring", async () => {
    findPublishedCourseBySlug.mockResolvedValue({
      id: "course-1",
      teacherId: "teacher-1",
      slug: "algebra-1",
      title: { en: "Algebra I", ar: "الجبر ١" },
    });
    findTeacherProfile.mockResolvedValue(null);

    await expect(publicService.getCoursePageBySlug("algebra-1")).resolves.toEqual({
      course: { id: "course-1", teacherId: "teacher-1", slug: "algebra-1", title: { en: "Algebra I", ar: "الجبر ١" } },
      teacher: null,
    });
  });

  it("throws NotFoundError when the slug doesn't resolve to a published course", async () => {
    findPublishedCourseBySlug.mockResolvedValue(null);

    await expect(publicService.getCoursePageBySlug("missing")).rejects.toBeInstanceOf(NotFoundError);
    expect(findTeacherProfile).not.toHaveBeenCalled();
  });
});
