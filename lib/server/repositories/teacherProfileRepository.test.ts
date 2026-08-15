import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const doc = vi.fn(() => ({ get: getDoc }));
const collection = vi.fn(() => ({ doc }));

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
