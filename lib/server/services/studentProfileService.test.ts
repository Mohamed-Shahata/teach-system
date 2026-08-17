import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const updateProfile = vi.fn();
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findById, updateProfile },
}));

const findStageById = vi.fn();
vi.mock("@/lib/server/repositories/educationStageRepository", () => ({
  educationStageRepository: { findById: findStageById },
}));

const { studentProfileService } = await import("./studentProfileService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "student", uid = "student-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const BASE_USER = {
  uid: "student-1",
  email: "student-1@example.com",
  displayName: "Sara",
  role: "student" as const,
  createdBy: { uid: "admin-1", role: "admin" as const },
  createdAt: 100,
};

describe("studentProfileService.getMyProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-student session", async () => {
    await expect(studentProfileService.getMyProfile(makeSession("teacher"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError if the user doc is missing", async () => {
    findById.mockResolvedValue(null);
    await expect(studentProfileService.getMyProfile(makeSession())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("omits age when birthDate is unset", async () => {
    findById.mockResolvedValue(BASE_USER);
    const result = await studentProfileService.getMyProfile(makeSession());
    expect(result.age).toBeUndefined();
    expect(result.birthDate).toBeUndefined();
  });

  it("derives age from birthDate and never persists it", async () => {
    findById.mockResolvedValue({ ...BASE_USER, birthDate: "2016-01-01" });
    const result = await studentProfileService.getMyProfile(makeSession());
    expect(result.age).toBeGreaterThan(0);
    expect(result.birthDate).toBe("2016-01-01");
  });

  it("joins stageId to a stage display name when set", async () => {
    findById.mockResolvedValue({ ...BASE_USER, stageId: "stage-1" });
    findStageById.mockResolvedValue({
      id: "stage-1",
      order: 1,
      category: "primary",
      name: { en: "Grade 1", ar: "الصف الأول" },
    });
    const result = await studentProfileService.getMyProfile(makeSession());
    expect(result.stageId).toBe("stage-1");
    expect(result.stageName).toEqual({ en: "Grade 1", ar: "الصف الأول" });
    expect(findStageById).toHaveBeenCalledWith("stage-1");
  });

  it("leaves stageName undefined when stageId is unset", async () => {
    findById.mockResolvedValue(BASE_USER);
    const result = await studentProfileService.getMyProfile(makeSession());
    expect(result.stageName).toBeUndefined();
    expect(findStageById).not.toHaveBeenCalled();
  });
});

describe("studentProfileService.updateMyProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-student session", async () => {
    await expect(
      studentProfileService.updateMyProfile(makeSession("admin"), { displayName: "New Name" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError if the user doc is missing", async () => {
    findById.mockResolvedValue(null);
    await expect(
      studentProfileService.updateMyProfile(makeSession(), { displayName: "New Name" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("persists the patch via userRepository.updateProfile and returns the merged profile", async () => {
    findById.mockResolvedValue(BASE_USER);
    updateProfile.mockResolvedValue(undefined);

    const result = await studentProfileService.updateMyProfile(makeSession(), {
      displayName: "Sara Ahmed",
      birthDate: "2016-01-01",
    });

    expect(updateProfile).toHaveBeenCalledWith("student-1", {
      displayName: "Sara Ahmed",
      birthDate: "2016-01-01",
    });
    expect(result.displayName).toBe("Sara Ahmed");
    expect(result.birthDate).toBe("2016-01-01");
    expect(result.age).toBeGreaterThan(0);
  });
});
