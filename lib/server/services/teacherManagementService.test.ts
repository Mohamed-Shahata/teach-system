import { beforeEach, describe, expect, it, vi } from "vitest";

const listByRole = vi.fn();
const findById = vi.fn();
const setDisabled = vi.fn();
const setCanCreateStudents = vi.fn();
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { listByRole, findById, setDisabled, setCanCreateStudents },
}));

const findStatsByTeacherId = vi.fn();
vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  EMPTY_TEACHER_PROFILE_STATS: {
    totalStudents: 0,
    totalCourses: 0,
    totalPublishedCourses: 0,
    totalLessons: 0,
    totalEnrollments: 0,
  },
  teacherProfileRepository: { findStatsByTeacherId },
}));

const updateUser = vi.fn();
vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminAuth: { updateUser },
}));

const { teacherManagementService } = await import("./teacherManagementService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "admin", uid = "admin-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const STATS = {
  totalStudents: 10,
  totalCourses: 3,
  totalPublishedCourses: 2,
  totalLessons: 20,
  totalEnrollments: 12,
};

describe("teacherManagementService.listTeachers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(teacherManagementService.listTeachers(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("joins each teacher with their teacherProfiles.stats", async () => {
    listByRole.mockResolvedValue([
      { uid: "t1", email: "t1@example.com", displayName: "Mona", role: "teacher", createdAt: 1 },
    ]);
    findStatsByTeacherId.mockResolvedValue(STATS);

    const result = await teacherManagementService.listTeachers(makeSession());

    expect(listByRole).toHaveBeenCalledWith("teacher", undefined);
    expect(result).toEqual([
      {
        uid: "t1",
        displayName: "Mona",
        email: "t1@example.com",
        disabled: false,
        canCreateStudents: true,
        stats: STATS,
      },
    ]);
  });
});

describe("teacherManagementService.getTeacherDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the user doesn't exist or isn't a teacher", async () => {
    findById.mockResolvedValue(null);
    await expect(teacherManagementService.getTeacherDetail(makeSession(), "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );

    findById.mockResolvedValue({ uid: "s1", role: "student" });
    await expect(teacherManagementService.getTeacherDetail(makeSession(), "s1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("returns the teacher joined with stats", async () => {
    findById.mockResolvedValue({
      uid: "t1",
      email: "t1@example.com",
      displayName: "Mona",
      role: "teacher",
      createdAt: 500,
    });
    findStatsByTeacherId.mockResolvedValue(STATS);

    await expect(teacherManagementService.getTeacherDetail(makeSession(), "t1")).resolves.toEqual({
      uid: "t1",
      displayName: "Mona",
      email: "t1@example.com",
      disabled: false,
      canCreateStudents: true,
      stats: STATS,
      createdAt: 500,
    });
  });
});

describe("teacherManagementService.setTeacherDisabled", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables the Firebase Auth account and mirrors the flag on the user doc", async () => {
    findById.mockResolvedValue({
      uid: "t1",
      email: "t1@example.com",
      displayName: "Mona",
      role: "teacher",
      createdAt: 500,
    });
    findStatsByTeacherId.mockResolvedValue(STATS);
    updateUser.mockResolvedValue(undefined);
    setDisabled.mockResolvedValue(undefined);

    const result = await teacherManagementService.setTeacherDisabled(makeSession(), "t1", true);

    expect(updateUser).toHaveBeenCalledWith("t1", { disabled: true });
    expect(setDisabled).toHaveBeenCalledWith("t1", true);
    expect(result.disabled).toBe(true);
  });

  it("throws NotFoundError for a non-teacher target", async () => {
    findById.mockResolvedValue(null);
    await expect(teacherManagementService.setTeacherDisabled(makeSession(), "missing", true)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("teacherManagementService.setTeacherPermissions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(
      teacherManagementService.setTeacherPermissions(makeSession("teacher"), "t1", false),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError when the user doesn't exist or isn't a teacher", async () => {
    findById.mockResolvedValue(null);
    await expect(
      teacherManagementService.setTeacherPermissions(makeSession(), "missing", false),
    ).rejects.toBeInstanceOf(NotFoundError);

    findById.mockResolvedValue({ uid: "s1", role: "student" });
    await expect(teacherManagementService.setTeacherPermissions(makeSession(), "s1", false)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(setCanCreateStudents).not.toHaveBeenCalled();
  });

  it("persists the flag without touching the Firebase Auth account", async () => {
    findById.mockResolvedValue({
      uid: "t1",
      email: "t1@example.com",
      displayName: "Mona",
      role: "teacher",
      createdAt: 500,
    });
    findStatsByTeacherId.mockResolvedValue(STATS);
    setCanCreateStudents.mockResolvedValue(undefined);

    const result = await teacherManagementService.setTeacherPermissions(makeSession(), "t1", false);

    expect(setCanCreateStudents).toHaveBeenCalledWith("t1", false);
    expect(updateUser).not.toHaveBeenCalled();
    expect(result.canCreateStudents).toBe(false);
  });
});
