import { beforeEach, describe, expect, it, vi } from "vitest";

const revokeRefreshTokens = vi.fn();
const getSession = vi.fn();
const clearSessionCookie = vi.fn();

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminAuth: { revokeRefreshTokens },
}));

vi.mock("@/lib/auth/session", () => ({
  getSession,
  clearSessionCookie,
}));

const { POST } = await import("./route");

describe("POST /api/auth/logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokes refresh tokens and clears the cookie for a logged-in user", async () => {
    getSession.mockResolvedValue({ uid: "uid-1", email: "a@b.com", role: "student" });

    const res = await POST();

    expect(revokeRefreshTokens).toHaveBeenCalledWith("uid-1");
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it("is idempotent: still returns 200 and clears the cookie with no session", async () => {
    getSession.mockResolvedValue(null);

    const res = await POST();

    expect(revokeRefreshTokens).not.toHaveBeenCalled();
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });
});
