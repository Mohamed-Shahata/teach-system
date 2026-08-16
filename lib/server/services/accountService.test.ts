import { beforeEach, describe, expect, it, vi } from "vitest";

const createUser = vi.fn();
const deleteUser = vi.fn();
const generatePasswordResetLink = vi.fn();
const createUserDoc = vi.fn();
const findUserById = vi.fn();
const createTeacherProfile = vi.fn();
const findTeacherProfileBySlug = vi.fn();

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminAuth: { createUser, deleteUser, generatePasswordResetLink },
  adminDb: {},
}));

vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { create: createUserDoc, findById: findUserById },
}));

vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  EMPTY_TEACHER_PROFILE_STATS: {
    totalStudents: 0,
    totalCourses: 0,
    totalPublishedCourses: 0,
    totalLessons: 0,
    totalEnrollments: 0,
  },
  teacherProfileRepository: { create: createTeacherProfile, findBySlug: findTeacherProfileBySlug },
}));

const incrementSystemStats = vi.fn();
vi.mock("@/lib/server/repositories/systemStatsRepository", () => ({
  systemStatsRepository: { incrementStats: incrementSystemStats },
}));

const { accountService } = await import("./accountService");
const { ForbiddenError, ConflictError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "uid-1") {
  return { uid, email: `${uid}@example.com`, role };
}

describe("accountService.createAccountByAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUser.mockResolvedValue({ uid: "new-uid" });
    deleteUser.mockResolvedValue(undefined);
    createUserDoc.mockResolvedValue(undefined);
    createTeacherProfile.mockResolvedValue(undefined);
    findTeacherProfileBySlug.mockResolvedValue(null);
    generatePasswordResetLink.mockResolvedValue("https://example.com/reset?oobCode=abc");
  });

  it("creates a teacher account and its teacherProfile, with createdBy = admin", async () => {
    const session = makeSession("admin", "admin-1");

    const result = await accountService.createAccountByAdmin(session, {
      role: "teacher",
      email: "mona@example.com",
      displayName: "Mona",
      phone: "01000000000",
    });

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "mona@example.com", displayName: "Mona" }),
    );
    expect(createUserDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "new-uid",
        role: "teacher",
        createdBy: { uid: "admin-1", role: "admin" },
      }),
    );
    expect(createTeacherProfile).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: "new-uid", displayName: "Mona", slug: "mona" }),
    );
    expect(result).toEqual({
      uid: "new-uid",
      email: "mona@example.com",
      displayName: "Mona",
      role: "teacher",
      resetLink: "https://example.com/reset?oobCode=abc",
    });
  });

  it("appends a numeric suffix when the slugified display name is already taken", async () => {
    const session = makeSession("admin", "admin-1");
    findTeacherProfileBySlug.mockImplementation(async (slug: string) =>
      slug === "mona" ? { teacherId: "someone-else", slug: "mona" } : null,
    );

    await accountService.createAccountByAdmin(session, {
      role: "teacher",
      email: "mona2@example.com",
      displayName: "Mona",
      phone: "01000000000",
    });

    expect(createTeacherProfile).toHaveBeenCalledWith(expect.objectContaining({ slug: "mona-2" }));
  });

  it("creates a student account without a teacherProfile, with createdBy = admin", async () => {
    const session = makeSession("admin", "admin-1");

    await accountService.createAccountByAdmin(session, {
      role: "student",
      email: "sara@example.com",
      displayName: "Sara",
      phone: "01000000000",
      stageId: "stage-3-secondary",
    });

    expect(createUserDoc).toHaveBeenCalledWith(
      expect.objectContaining({ role: "student", stageId: "stage-3-secondary" }),
    );
    expect(createTeacherProfile).not.toHaveBeenCalled();
  });

  it("rejects a non-admin session", async () => {
    const session = makeSession("teacher", "teacher-1");

    await expect(
      accountService.createAccountByAdmin(session, {
        role: "student",
        email: "sara@example.com",
        displayName: "Sara",
        phone: "01000000000",
        stageId: "stage-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("throws ConflictError when the email is already registered", async () => {
    createUser.mockRejectedValue({ code: "auth/email-already-exists" });
    const session = makeSession("admin");

    await expect(
      accountService.createAccountByAdmin(session, {
        role: "teacher",
        email: "taken@example.com",
        displayName: "X",
        phone: "01000000000",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rolls back the Auth account if the Firestore write fails", async () => {
    createUserDoc.mockRejectedValue(new Error("firestore down"));
    const session = makeSession("admin");

    await expect(
      accountService.createAccountByAdmin(session, {
        role: "teacher",
        email: "mona@example.com",
        displayName: "Mona",
        phone: "01000000000",
      }),
    ).rejects.toThrow("firestore down");

    expect(deleteUser).toHaveBeenCalledWith("new-uid");
  });
});

describe("accountService.createStudentByTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUser.mockResolvedValue({ uid: "new-uid" });
    createUserDoc.mockResolvedValue(undefined);
    generatePasswordResetLink.mockResolvedValue("https://example.com/reset?oobCode=xyz");
    findUserById.mockResolvedValue({ uid: "teacher-1", role: "teacher" });
  });

  it("creates a student account with createdBy = the acting teacher", async () => {
    const session = makeSession("teacher", "teacher-1");

    const result = await accountService.createStudentByTeacher(session, {
      email: "sara@example.com",
      displayName: "Sara",
      stageId: "stage-1",
    });

    expect(createUserDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "student",
        stageId: "stage-1",
        createdBy: { uid: "teacher-1", role: "teacher" },
      }),
    );
    expect(createTeacherProfile).not.toHaveBeenCalled();
    expect(result.role).toBe("student");
  });

  it("blocks a teacher whose canCreateStudents flag was turned off by the Admin", async () => {
    findUserById.mockResolvedValue({ uid: "teacher-1", role: "teacher", canCreateStudents: false });
    const session = makeSession("teacher", "teacher-1");

    await expect(
      accountService.createStudentByTeacher(session, {
        email: "sara@example.com",
        displayName: "Sara",
        stageId: "stage-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("allows creation when canCreateStudents is undefined (default-allowed, pre-Phase-5 teachers)", async () => {
    findUserById.mockResolvedValue({ uid: "teacher-1", role: "teacher" });
    const session = makeSession("teacher", "teacher-1");

    const result = await accountService.createStudentByTeacher(session, {
      email: "sara@example.com",
      displayName: "Sara",
      stageId: "stage-1",
    });

    expect(result.role).toBe("student");
  });

  it("throws NotFoundError if the acting teacher's own user doc is missing", async () => {
    findUserById.mockResolvedValue(null);
    const session = makeSession("teacher", "teacher-1");

    await expect(
      accountService.createStudentByTeacher(session, {
        email: "sara@example.com",
        displayName: "Sara",
        stageId: "stage-1",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects a non-teacher session", async () => {
    const session = makeSession("student", "student-1");

    await expect(
      accountService.createStudentByTeacher(session, {
        email: "sara@example.com",
        displayName: "Sara",
        stageId: "stage-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(createUser).not.toHaveBeenCalled();
  });
});
