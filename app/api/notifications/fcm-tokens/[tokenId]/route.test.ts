import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const removeToken = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/fcmTokenService", () => ({
  fcmTokenService: { removeToken },
}));

const { DELETE } = await import("./route");
const { NotFoundError } = await import("@/lib/errors");

const session = { uid: "user-1", email: "u@example.com", role: "student" };
const context = { params: Promise.resolve({ tokenId: "tok-1" }) };

function makeRequest() {
  return new Request("http://localhost/api/notifications/fcm-tokens/tok-1", { method: "DELETE" });
}

describe("DELETE /api/notifications/fcm-tokens/[tokenId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("removes the caller's own token", async () => {
    removeToken.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest(), context);

    expect(res.status).toBe(200);
    expect(removeToken).toHaveBeenCalledWith(session, "tok-1");
  });

  it("returns 404 for a token that isn't the caller's own", async () => {
    removeToken.mockRejectedValue(new NotFoundError());

    const res = await DELETE(makeRequest(), context);

    expect(res.status).toBe(404);
  });
});
