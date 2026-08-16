import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const generatePasswordResetLink = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/teacherSettingsService", () => ({
  teacherSettingsService: { generatePasswordResetLink },
}));

const { POST } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("POST /api/teacher/settings/password-reset-link", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a reset link", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    generatePasswordResetLink.mockResolvedValue({ resetLink: "https://example.com/reset?token=abc" });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(generatePasswordResetLink).toHaveBeenCalledWith({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
  });

  it("returns 403 for a non-teacher session", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    generatePasswordResetLink.mockRejectedValue(new ForbiddenError());

    const res = await POST();

    expect(res.status).toBe(403);
  });
});
