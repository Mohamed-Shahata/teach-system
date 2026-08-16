import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const updateDisplayName = vi.fn();
const updateAvatar = vi.fn();
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findById, updateDisplayName, updateAvatar },
}));

const updateUser = vi.fn();
const generatePasswordResetLink = vi.fn();
vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminAuth: { updateUser, generatePasswordResetLink },
}));

const destroyCloudinaryUpload = vi.fn();
vi.mock("@/lib/server/cloudinary", () => ({
  destroyCloudinaryUpload,
}));

const { teacherSettingsService } = await import("./teacherSettingsService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "teacher", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const TEACHER_USER = {
  uid: "teacher-1",
  email: "teacher-1@example.com",
  displayName: "Samir",
  role: "teacher" as const,
  createdBy: { uid: "admin-1", role: "admin" as const },
  createdAt: 100,
};

describe("teacherSettingsService.getProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-teacher session", async () => {
    await expect(teacherSettingsService.getProfile(makeSession("student"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError if the user doc is missing", async () => {
    findById.mockResolvedValue(null);
    await expect(teacherSettingsService.getProfile(makeSession())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns the profile", async () => {
    findById.mockResolvedValue(TEACHER_USER);
    await expect(teacherSettingsService.getProfile(makeSession())).resolves.toEqual({
      uid: "teacher-1",
      email: "teacher-1@example.com",
      displayName: "Samir",
      avatarUrl: undefined,
    });
  });
});

describe("teacherSettingsService.updateDisplayName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-teacher session", async () => {
    await expect(
      teacherSettingsService.updateDisplayName(makeSession("admin"), "New Name"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates Firebase Auth and the user doc", async () => {
    findById.mockResolvedValue(TEACHER_USER);
    updateUser.mockResolvedValue(undefined);
    updateDisplayName.mockResolvedValue(undefined);

    const result = await teacherSettingsService.updateDisplayName(makeSession(), "New Name");

    expect(updateUser).toHaveBeenCalledWith("teacher-1", { displayName: "New Name" });
    expect(updateDisplayName).toHaveBeenCalledWith("teacher-1", "New Name");
    expect(result.displayName).toBe("New Name");
  });
});

describe("teacherSettingsService.generatePasswordResetLink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-teacher session", async () => {
    await expect(teacherSettingsService.generatePasswordResetLink(makeSession("student"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("generates a reset link for the teacher's own email", async () => {
    findById.mockResolvedValue(TEACHER_USER);
    generatePasswordResetLink.mockResolvedValue("https://example.com/reset?token=abc");

    const result = await teacherSettingsService.generatePasswordResetLink(makeSession());

    expect(generatePasswordResetLink).toHaveBeenCalledWith("teacher-1@example.com");
    expect(result).toEqual({ resetLink: "https://example.com/reset?token=abc" });
  });
});

describe("teacherSettingsService.updateAvatar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-teacher session", async () => {
    await expect(
      teacherSettingsService.updateAvatar(makeSession("admin"), "https://example.com/a.jpg", "pub-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("saves the new avatar without destroying anything when there was no previous one", async () => {
    findById.mockResolvedValue(TEACHER_USER);
    updateAvatar.mockResolvedValue(undefined);

    const result = await teacherSettingsService.updateAvatar(makeSession(), "https://example.com/a.jpg", "pub-1");

    expect(destroyCloudinaryUpload).not.toHaveBeenCalled();
    expect(updateAvatar).toHaveBeenCalledWith("teacher-1", "https://example.com/a.jpg", "pub-1");
    expect(result.avatarUrl).toBe("https://example.com/a.jpg");
  });

  it("destroys the previous avatar when replacing it", async () => {
    findById.mockResolvedValue({ ...TEACHER_USER, avatarUrl: "old-url", avatarPublicId: "pub-old" });
    updateAvatar.mockResolvedValue(undefined);

    await teacherSettingsService.updateAvatar(makeSession(), "https://example.com/new.jpg", "pub-new");

    expect(destroyCloudinaryUpload).toHaveBeenCalledWith("pub-old", "image");
    expect(updateAvatar).toHaveBeenCalledWith("teacher-1", "https://example.com/new.jpg", "pub-new");
  });

  it("still saves the new avatar even if destroying the old one fails", async () => {
    findById.mockResolvedValue({ ...TEACHER_USER, avatarUrl: "old-url", avatarPublicId: "pub-old" });
    destroyCloudinaryUpload.mockRejectedValue(new Error("cloudinary down"));
    updateAvatar.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      teacherSettingsService.updateAvatar(makeSession(), "https://example.com/new.jpg", "pub-new"),
    ).resolves.toBeTruthy();
    expect(updateAvatar).toHaveBeenCalledWith("teacher-1", "https://example.com/new.jpg", "pub-new");
  });
});
