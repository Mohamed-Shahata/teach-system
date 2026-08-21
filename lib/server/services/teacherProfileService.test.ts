import { beforeEach, describe, expect, it, vi } from "vitest";

const findByTeacherId = vi.fn();
const updateDetails = vi.fn();
vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { findByTeacherId, updateDetails },
}));

const { teacherProfileService } = await import("./teacherProfileService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "teacher", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const BASE_PROFILE = {
  teacherId: "teacher-1",
  slug: "samir",
  displayName: "Samir",
  isPublic: true,
  createdAt: 100,
  stats: {
    totalStudents: 0,
    totalCourses: 0,
    totalPublishedCourses: 0,
    totalLessons: 0,
    totalEnrollments: 0,
  },
};

describe("teacherProfileService.getProfileForAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(
      teacherProfileService.getProfileForAdmin(makeSession("teacher"), "teacher-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns null instead of throwing when no profile doc exists yet", async () => {
    findByTeacherId.mockResolvedValue(null);
    const result = await teacherProfileService.getProfileForAdmin(makeSession("admin", "admin-1"), "teacher-1");
    expect(result).toBeNull();
  });

  it("returns the given teacher's profile for an admin session", async () => {
    findByTeacherId.mockResolvedValue(BASE_PROFILE);
    const result = await teacherProfileService.getProfileForAdmin(makeSession("admin", "admin-1"), "teacher-1");
    expect(findByTeacherId).toHaveBeenCalledWith("teacher-1");
    expect(result?.teacherId).toBe("teacher-1");
  });
});

describe("teacherProfileService.getMyProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-teacher session", async () => {
    await expect(teacherProfileService.getMyProfile(makeSession("student"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError if the profile doc is missing", async () => {
    findByTeacherId.mockResolvedValue(null);
    await expect(teacherProfileService.getMyProfile(makeSession())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("computes 0% completeness with none of the TASK-3101 fields set", async () => {
    findByTeacherId.mockResolvedValue(BASE_PROFILE);
    const result = await teacherProfileService.getMyProfile(makeSession());
    expect(result.completeness).toBe(0);
  });

  it("computes partial completeness proportional to filled fields", async () => {
    findByTeacherId.mockResolvedValue({
      ...BASE_PROFILE,
      bio: { en: "Hello" },
      specialization: "Algebra",
      avatarUrl: "https://example.com/a.jpg",
    });
    const result = await teacherProfileService.getMyProfile(makeSession());
    // 3 of 6 fields filled -> 50%
    expect(result.completeness).toBe(50);
  });

  it("computes 100% completeness with every field set", async () => {
    findByTeacherId.mockResolvedValue({
      ...BASE_PROFILE,
      bio: { en: "Hello", ar: "مرحبا" },
      headline: { en: "Great teacher" },
      yearsOfExperience: 5,
      specialization: "Algebra",
      socialLinks: { facebook: "https://facebook.com/x" },
      avatarUrl: "https://example.com/a.jpg",
    });
    const result = await teacherProfileService.getMyProfile(makeSession());
    expect(result.completeness).toBe(100);
  });
});

describe("teacherProfileService.updateMyProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-teacher session", async () => {
    await expect(
      teacherProfileService.updateMyProfile(makeSession("admin"), { specialization: "Physics" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError if the profile doc is missing", async () => {
    findByTeacherId.mockResolvedValue(null);
    await expect(
      teacherProfileService.updateMyProfile(makeSession(), { specialization: "Physics" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("persists only the changed fields and returns the merged, recomputed profile", async () => {
    findByTeacherId.mockResolvedValue(BASE_PROFILE);
    updateDetails.mockResolvedValue(undefined);

    const result = await teacherProfileService.updateMyProfile(makeSession(), {
      specialization: "Physics",
      yearsOfExperience: 3,
    });

    expect(updateDetails).toHaveBeenCalledWith("teacher-1", { specialization: "Physics", yearsOfExperience: 3 });
    expect(result.specialization).toBe("Physics");
    expect(result.yearsOfExperience).toBe(3);
    expect(result.completeness).toBe(Math.round((2 / 6) * 100));
  });
});
