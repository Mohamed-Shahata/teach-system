import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const generatePasswordResetLink = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/studentSettingsService", () => ({
  studentSettingsService: { generatePasswordResetLink },
}));

const { POST } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("POST /api/student/settings/password-reset-link", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a reset link", async () => {
    requireSession.mockResolvedValue({ uid: "student-1", email: "s@b.com", role: "student" });
    generatePasswordResetLink.mockResolvedValue({ resetLink: "https://example.com/reset?token=abc" });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(generatePasswordResetLink).toHaveBeenCalledWith({ uid: "student-1", email: "s@b.com", role: "student" });
  });

  it("returns 403 for a non-student session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    generatePasswordResetLink.mockRejectedValue(new ForbiddenError());

    const res = await POST();

    expect(res.status).toBe(403);
  });
});
