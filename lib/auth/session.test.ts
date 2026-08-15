import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();
const createSessionCookie = vi.fn();
const verifySessionCookie = vi.fn();
const findById = vi.fn();

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminAuth: { verifyIdToken, createSessionCookie, verifySessionCookie },
}));

vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findById },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const { cookies } = await import("next/headers");
const {
  createSessionCookieValue,
  getSession,
  setSessionCookie,
  clearSessionCookie,
  SESSION_COOKIE_NAME,
} = await import("./session");
const { UnauthorizedError } = await import("@/lib/errors");

describe("createSessionCookieValue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("verifies the ID token then exchanges it for a session cookie", async () => {
    verifyIdToken.mockResolvedValue({ uid: "uid-1" });
    createSessionCookie.mockResolvedValue("cookie-value");

    const value = await createSessionCookieValue("token");

    expect(verifyIdToken).toHaveBeenCalledWith("token");
    expect(createSessionCookie).toHaveBeenCalledWith("token", expect.objectContaining({ expiresIn: expect.any(Number) }));
    expect(value).toBe("cookie-value");
  });

  it("throws UnauthorizedError for an invalid ID token", async () => {
    verifyIdToken.mockRejectedValue(new Error("invalid"));

    await expect(createSessionCookieValue("bad")).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when there is no session cookie", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: () => undefined });

    expect(await getSession()).toBeNull();
    expect(verifySessionCookie).not.toHaveBeenCalled();
  });

  it("returns null when the cookie fails verification (invalid/expired/revoked)", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: () => ({ value: "cookie" }) });
    verifySessionCookie.mockRejectedValue(new Error("revoked"));

    expect(await getSession()).toBeNull();
  });

  it("returns null when the session's user doc no longer exists", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: () => ({ value: "cookie" }) });
    verifySessionCookie.mockResolvedValue({ uid: "uid-1", email: "a@b.com" });
    findById.mockResolvedValue(null);

    expect(await getSession()).toBeNull();
  });

  it("returns the session with role read from users/{uid}, not the token", async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({ get: () => ({ value: "cookie" }) });
    verifySessionCookie.mockResolvedValue({ uid: "uid-1", email: "a@b.com" });
    findById.mockResolvedValue({ uid: "uid-1", email: "a@b.com", role: "teacher", displayName: "A", createdAt: 1 });

    expect(await getSession()).toEqual({ uid: "uid-1", email: "a@b.com", role: "teacher" });
  });
});

describe("cookie set/clear", () => {
  it("sets an HttpOnly, SameSite=Lax cookie with the session value", () => {
    const set = vi.fn();
    setSessionCookie({ set }, "cookie-value");

    expect(set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      "cookie-value",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });

  it("clears the cookie with maxAge 0", () => {
    const set = vi.fn();
    clearSessionCookie({ set });

    expect(set).toHaveBeenCalledWith(SESSION_COOKIE_NAME, "", expect.objectContaining({ maxAge: 0 }));
  });
});
