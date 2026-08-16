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

const { adminSettingsService } = await import("./adminSettingsService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "admin", uid = "admin-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const ADMIN_USER = {
  uid: "admin-1",
  email: "admin-1@example.com",
  displayName: "Layla",
  role: "admin" as const,
  createdBy: { uid: "admin-1", role: "admin" as const },
  createdAt: 100,
};

describe("adminSettingsService.getProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(adminSettingsService.getProfile(makeSession("teacher"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError if the user doc is missing", async () => {
    findById.mockResolvedValue(null);
    await expect(adminSettingsService.getProfile(makeSession())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns the profile", async () => {
    findById.mockResolvedValue(ADMIN_USER);
    await expect(adminSettingsService.getProfile(makeSession())).resolves.toEqual({
      uid: "admin-1",
      email: "admin-1@example.com",
      displayName: "Layla",
    });
  });
});

describe("adminSettingsService.updateDisplayName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(
      adminSettingsService.updateDisplayName(makeSession("student"), "New Name"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates Firebase Auth and the user doc", async () => {
    findById.mockResolvedValue(ADMIN_USER);
    updateUser.mockResolvedValue(undefined);
    updateDisplayName.mockResolvedValue(undefined);

    const result = await adminSettingsService.updateDisplayName(makeSession(), "New Name");

    expect(updateUser).toHaveBeenCalledWith("admin-1", { displayName: "New Name" });
    expect(updateDisplayName).toHaveBeenCalledWith("admin-1", "New Name");
    expect(result).toEqual({ uid: "admin-1", email: "admin-1@example.com", displayName: "New Name" });
  });
});

describe("adminSettingsService.generatePasswordResetLink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(adminSettingsService.generatePasswordResetLink(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("generates a reset link for the admin's own email", async () => {
    findById.mockResolvedValue(ADMIN_USER);
    generatePasswordResetLink.mockResolvedValue("https://example.com/reset?token=abc");

    const result = await adminSettingsService.generatePasswordResetLink(makeSession());

    expect(generatePasswordResetLink).toHaveBeenCalledWith("admin-1@example.com");
    expect(result).toEqual({ resetLink: "https://example.com/reset?token=abc" });
  });
});

describe("adminSettingsService.updateAvatar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(
      adminSettingsService.updateAvatar(makeSession("teacher"), "https://example.com/a.jpg", "pub-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("saves the new avatar without destroying anything when there was no previous one", async () => {
    findById.mockResolvedValue(ADMIN_USER);
    updateAvatar.mockResolvedValue(undefined);

    const result = await adminSettingsService.updateAvatar(makeSession(), "https://example.com/a.jpg", "pub-1");

    expect(destroyCloudinaryUpload).not.toHaveBeenCalled();
    expect(updateAvatar).toHaveBeenCalledWith("admin-1", "https://example.com/a.jpg", "pub-1");
    expect(result.avatarUrl).toBe("https://example.com/a.jpg");
  });

  it("destroys the previous avatar when replacing it", async () => {
    findById.mockResolvedValue({ ...ADMIN_USER, avatarUrl: "old-url", avatarPublicId: "pub-old" });
    updateAvatar.mockResolvedValue(undefined);

    await adminSettingsService.updateAvatar(makeSession(), "https://example.com/new.jpg", "pub-new");

    expect(destroyCloudinaryUpload).toHaveBeenCalledWith("pub-old", "image");
    expect(updateAvatar).toHaveBeenCalledWith("admin-1", "https://example.com/new.jpg", "pub-new");
  });

  it("still saves the new avatar even if destroying the old one fails", async () => {
    findById.mockResolvedValue({ ...ADMIN_USER, avatarUrl: "old-url", avatarPublicId: "pub-old" });
    destroyCloudinaryUpload.mockRejectedValue(new Error("cloudinary down"));
    updateAvatar.mockResolvedValue(undefined);

    await expect(
      adminSettingsService.updateAvatar(makeSession(), "https://example.com/new.jpg", "pub-new"),
    ).resolves.toBeDefined();
    expect(updateAvatar).toHaveBeenCalledWith("admin-1", "https://example.com/new.jpg", "pub-new");
  });

  it("throws NotFoundError if the user doc is missing", async () => {
    findById.mockResolvedValue(null);
    await expect(
      adminSettingsService.updateAvatar(makeSession(), "https://example.com/a.jpg", "pub-1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
