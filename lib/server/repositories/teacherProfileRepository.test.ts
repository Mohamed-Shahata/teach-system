import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const doc = vi.fn(() => ({ get: getDoc }));
const getQuery = vi.fn();
const limit = vi.fn(() => ({ get: getQuery }));
const where = vi.fn(() => ({ limit }));
const collection = vi.fn(() => ({ doc, where }));

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { EMPTY_TEACHER_PROFILE_STATS, teacherProfileRepository } = await import(
  "./teacherProfileRepository"
);

describe("teacherProfileRepository.findStatsByTeacherId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads stats from teacherProfiles/{teacherId}", async () => {
    getDoc.mockResolvedValue({
      exists: true,
      data: () => ({
        stats: {
          totalStudents: 12,
          totalCourses: 4,
          totalPublishedCourses: 3,
          totalLessons: 29,
          totalEnrollments: 18,
        },
      }),
    });

    await expect(teacherProfileRepository.findStatsByTeacherId("teacher-1")).resolves.toEqual({
      totalStudents: 12,
      totalCourses: 4,
      totalPublishedCourses: 3,
      totalLessons: 29,
      totalEnrollments: 18,
    });
    expect(collection).toHaveBeenCalledWith("teacherProfiles");
    expect(doc).toHaveBeenCalledWith("teacher-1");
  });

  it("defaults missing legacy counters to zero", async () => {
    getDoc.mockResolvedValue({
      exists: true,
      data: () => ({ stats: { totalCourses: 2 } }),
    });

    await expect(teacherProfileRepository.findStatsByTeacherId("teacher-1")).resolves.toEqual({
      ...EMPTY_TEACHER_PROFILE_STATS,
      totalCourses: 2,
    });
  });

  it("returns empty stats when the profile is missing", async () => {
    getDoc.mockResolvedValue({ exists: false });

    await expect(teacherProfileRepository.findStatsByTeacherId("teacher-1")).resolves.toEqual(
      EMPTY_TEACHER_PROFILE_STATS,
    );
  });
});

describe("teacherProfileRepository.findBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks up teacherProfiles by slug (global, not teacher-scoped)", async () => {
    getQuery.mockResolvedValue({
      docs: [
        {
          id: "teacher-1",
          data: () => ({ displayName: "Mona", slug: "mona", isPublic: true, createdAt: 100 }),
        },
      ],
    });

    await expect(teacherProfileRepository.findBySlug("mona")).resolves.toEqual({
      teacherId: "teacher-1",
      slug: "mona",
      displayName: "Mona",
      isPublic: true,
      stats: EMPTY_TEACHER_PROFILE_STATS,
      createdAt: 100,
    });
    expect(where).toHaveBeenCalledWith("slug", "==", "mona");
  });

  it("returns null when no profile matches the slug", async () => {
    getQuery.mockResolvedValue({ docs: [] });

    await expect(teacherProfileRepository.findBySlug("missing")).resolves.toBeNull();
  });
});
