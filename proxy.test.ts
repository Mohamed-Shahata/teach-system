import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const verifySessionCookieValue = vi.fn();
const intlMiddlewareImpl = vi.fn(() => NextResponse.next());
const createIntlMiddleware = vi.fn(() => intlMiddlewareImpl);

vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "session",
  verifySessionCookieValue,
}));

vi.mock("next-intl/middleware", () => ({
  default: createIntlMiddleware,
}));

const { default: proxy } = await import("./proxy");

function makeRequest(pathname: string, cookieValue?: string): NextRequest {
  const request = new NextRequest(new URL(pathname, "https://example.com"));
  if (cookieValue !== undefined) {
    request.cookies.set("session", cookieValue);
  }
  return request;
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intlMiddlewareImpl.mockImplementation(() => NextResponse.next());
  });

  it("delegates public routes straight to the intl middleware without checking the session", async () => {
    const request = makeRequest("/en/login");

    await proxy(request);

    expect(verifySessionCookieValue).not.toHaveBeenCalled();
    expect(intlMiddlewareImpl).toHaveBeenCalledWith(request);
  });

  it("redirects unauthenticated visitors of a protected route to the localized login page", async () => {
    verifySessionCookieValue.mockResolvedValue(null);
    const request = makeRequest("/en/teacher/dashboard");

    const res = await proxy(request);

    expect(verifySessionCookieValue).toHaveBeenCalledWith(undefined);
    expect(intlMiddlewareImpl).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/en/login");
  });

  it("preserves the requested locale in the login redirect", async () => {
    verifySessionCookieValue.mockResolvedValue(null);
    const request = makeRequest("/ar/student/dashboard");

    const res = await proxy(request);

    expect(res.headers.get("location")).toBe("https://example.com/ar/login");
  });

  it("falls back to the default locale for an unprefixed protected path", async () => {
    verifySessionCookieValue.mockResolvedValue(null);
    const request = makeRequest("/admin/settings");

    const res = await proxy(request);

    expect(res.headers.get("location")).toBe("https://example.com/en/login");
  });

  it("passes an authenticated session through to the intl middleware and stamps user headers", async () => {
    verifySessionCookieValue.mockResolvedValue({ uid: "uid-1", email: "t@x.com", role: "teacher" });
    const request = makeRequest("/en/teacher/dashboard", "valid-cookie");

    const res = await proxy(request);

    expect(verifySessionCookieValue).toHaveBeenCalledWith("valid-cookie");
    expect(intlMiddlewareImpl).toHaveBeenCalledWith(request);
    expect(res.headers.get("x-user-id")).toBe("uid-1");
    expect(res.headers.get("x-user-role")).toBe("teacher");
  });

  it("rejects an invalid/revoked session cookie the same as a missing one", async () => {
    verifySessionCookieValue.mockResolvedValue(null);
    const request = makeRequest("/en/student/courses/abc", "revoked-cookie");

    const res = await proxy(request);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/en/login");
  });
});
