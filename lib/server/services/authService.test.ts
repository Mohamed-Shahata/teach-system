import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const findById = vi.fn();
const createUser = vi.fn();
const createTeacherProfile = vi.fn();

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminAuth: { verifyIdToken },
  adminDb: {},
}));

vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findById, create: createUser },
}));

vi.mock("@/lib/server/repositories/teacherProfileRepository", () => ({
  teacherProfileRepository: { create: createTeacherProfile },
}));

const { authService } = await import("./authService");
const { ConflictError, UnauthorizedError } = await import("@/lib/errors");

describe("authService.registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: "uid-1", email: "student@example.com" });
    findById.mockResolvedValue(null);
    createUser.mockResolvedValue(undefined);
    createTeacherProfile.mockResolvedValue(undefined);
  });

  it("creates a users/{uid} doc with the server-verified uid/email and given role", async () => {
    const result = await authService.registerUser({
      idToken: "token",
      role: "student",
      displayName: "Sara",
    });

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "uid-1", email: "student@example.com", role: "student", displayName: "Sara" }),
    );
    expect(createTeacherProfile).not.toHaveBeenCalled();
    expect(result).toEqual({ uid: "uid-1", email: "student@example.com", displayName: "Sara", role: "student" });
  });

  it("also creates a teacherProfiles/{uid} doc when role is teacher", async () => {
    await authService.registerUser({ idToken: "token", role: "teacher", displayName: "Mona" });

    expect(createTeacherProfile).toHaveBeenCalledWith(
      expect.objectContaining({ teacherId: "uid-1", displayName: "Mona", isPublic: false }),
    );
  });

  it("throws UnauthorizedError when the ID token is invalid", async () => {
    verifyIdToken.mockRejectedValue(new Error("bad token"));

    await expect(
      authService.registerUser({ idToken: "bad", role: "student", displayName: "X" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(createUser).not.toHaveBeenCalled();
  });

  it("throws ConflictError (translated emailInUse key) when the uid is already registered", async () => {
    findById.mockResolvedValue({ uid: "uid-1", email: "student@example.com", role: "student", createdAt: 1, displayName: "Sara" });

    const err = await authService
      .registerUser({ idToken: "token", role: "student", displayName: "Sara" })
      .catch((e) => e);

    expect(err).toBeInstanceOf(ConflictError);
    expect(err.messageKey).toBe("auth.register.errors.emailInUse");
    expect(createUser).not.toHaveBeenCalled();
  });

  it("throws ConflictError if user creation races and the doc already exists", async () => {
    createUser.mockRejectedValue(new Error("already exists"));

    await expect(
      authService.registerUser({ idToken: "token", role: "student", displayName: "Sara" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
