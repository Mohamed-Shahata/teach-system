import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const generatePasswordResetLink = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/adminSettingsService", () => ({
  adminSettingsService: { generatePasswordResetLink },
}));

const { POST } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("POST /api/admin/settings/password-reset-link", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a reset link", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    generatePasswordResetLink.mockResolvedValue({ resetLink: "https://example.com/reset?token=abc" });

    const res = await POST();

    expect(res.status).toBe(200);
    expect(generatePasswordResetLink).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" });
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    generatePasswordResetLink.mockRejectedValue(new ForbiddenError());

    const res = await POST();

    expect(res.status).toBe(403);
  });
});
