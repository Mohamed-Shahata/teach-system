import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const updateAvatar = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/adminSettingsService", () => ({
  adminSettingsService: { updateAvatar },
}));

const { PATCH } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/settings/avatar", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/settings/avatar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves the avatar", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    updateAvatar.mockResolvedValue({
      uid: "admin-1",
      email: "a@b.com",
      displayName: "Layla",
      avatarUrl: "https://example.com/a.jpg",
    });

    const res = await PATCH(makeRequest({ avatarUrl: "https://example.com/a.jpg", avatarPublicId: "pub-1" }));

    expect(res.status).toBe(200);
    expect(updateAvatar).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      "https://example.com/a.jpg",
      "pub-1",
    );
  });

  it("rejects a malformed body", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await PATCH(makeRequest({ avatarUrl: "not-a-url", avatarPublicId: "pub-1" }));

    expect(res.status).toBe(400);
    expect(updateAvatar).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    updateAvatar.mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest({ avatarUrl: "https://example.com/a.jpg", avatarPublicId: "pub-1" }));

    expect(res.status).toBe(403);
  });
});
