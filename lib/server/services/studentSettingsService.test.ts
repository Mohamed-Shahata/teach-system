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

const { studentSettingsService } = await import("./studentSettingsService");
const { ForbiddenError, NotFoundError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "student", uid = "student-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const STUDENT_USER = {
  uid: "student-1",
  email: "student-1@example.com",
  displayName: "Nour",
  role: "student" as const,
  createdBy: { uid: "teacher-1", role: "teacher" as const },
  createdAt: 100,
};

describe("studentSettingsService.getProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-student session", async () => {
    await expect(studentSettingsService.getProfile(makeSession("teacher"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws NotFoundError if the user doc is missing", async () => {
    findById.mockResolvedValue(null);
    await expect(studentSettingsService.getProfile(makeSession())).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns the profile", async () => {
    findById.mockResolvedValue(STUDENT_USER);
    await expect(studentSettingsService.getProfile(makeSession())).resolves.toEqual({
      uid: "student-1",
      email: "student-1@example.com",
      displayName: "Nour",
      avatarUrl: undefined,
      pushEnabled: true,
    });
  });
});

describe("studentSettingsService.updateDisplayName", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-student session", async () => {
    await expect(
      studentSettingsService.updateDisplayName(makeSession("admin"), "New Name"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updates Firebase Auth and the user doc", async () => {
    findById.mockResolvedValue(STUDENT_USER);
    updateUser.mockResolvedValue(undefined);
    updateDisplayName.mockResolvedValue(undefined);

    const result = await studentSettingsService.updateDisplayName(makeSession(), "New Name");

    expect(updateUser).toHaveBeenCalledWith("student-1", { displayName: "New Name" });
    expect(updateDisplayName).toHaveBeenCalledWith("student-1", "New Name");
    expect(result.displayName).toBe("New Name");
  });
});

describe("studentSettingsService.generatePasswordResetLink", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-student session", async () => {
    await expect(studentSettingsService.generatePasswordResetLink(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("generates a reset link for the student's own email", async () => {
    findById.mockResolvedValue(STUDENT_USER);
    generatePasswordResetLink.mockResolvedValue("https://example.com/reset?token=abc");

    const result = await studentSettingsService.generatePasswordResetLink(makeSession());

    expect(generatePasswordResetLink).toHaveBeenCalledWith("student-1@example.com");
    expect(result).toEqual({ resetLink: "https://example.com/reset?token=abc" });
  });
});

describe("studentSettingsService.updateAvatar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-student session", async () => {
    await expect(
      studentSettingsService.updateAvatar(makeSession("admin"), "https://example.com/a.jpg", "pub-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("saves the new avatar without destroying anything when there was no previous one", async () => {
    findById.mockResolvedValue(STUDENT_USER);
    updateAvatar.mockResolvedValue(undefined);

    const result = await studentSettingsService.updateAvatar(makeSession(), "https://example.com/a.jpg", "pub-1");

    expect(destroyCloudinaryUpload).not.toHaveBeenCalled();
    expect(updateAvatar).toHaveBeenCalledWith("student-1", "https://example.com/a.jpg", "pub-1");
    expect(result.avatarUrl).toBe("https://example.com/a.jpg");
  });

  it("destroys the previous avatar when replacing it", async () => {
    findById.mockResolvedValue({ ...STUDENT_USER, avatarUrl: "old-url", avatarPublicId: "pub-old" });
    updateAvatar.mockResolvedValue(undefined);

    await studentSettingsService.updateAvatar(makeSession(), "https://example.com/new.jpg", "pub-new");

    expect(destroyCloudinaryUpload).toHaveBeenCalledWith("pub-old", "image");
    expect(updateAvatar).toHaveBeenCalledWith("student-1", "https://example.com/new.jpg", "pub-new");
  });

  it("still saves the new avatar even if destroying the old one fails", async () => {
    findById.mockResolvedValue({ ...STUDENT_USER, avatarUrl: "old-url", avatarPublicId: "pub-old" });
    destroyCloudinaryUpload.mockRejectedValue(new Error("cloudinary down"));
    updateAvatar.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      studentSettingsService.updateAvatar(makeSession(), "https://example.com/new.jpg", "pub-new"),
    ).resolves.toBeTruthy();
    expect(updateAvatar).toHaveBeenCalledWith("student-1", "https://example.com/new.jpg", "pub-new");
  });
});

describe("studentSettingsService.getProfile — pushEnabled is always true (TASK-3001)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports pushEnabled true even if the stored doc has it false (legacy data, self-service toggle removed)", async () => {
    findById.mockResolvedValue({ ...STUDENT_USER, pushEnabled: false });
    const result = await studentSettingsService.getProfile(makeSession());
    expect(result.pushEnabled).toBe(true);
  });
});
