import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const registerToken = vi.fn();
const listMyTokens = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/fcmTokenService", () => ({
  fcmTokenService: { registerToken, listMyTokens },
}));

const { POST, GET } = await import("./route");

const session = { uid: "user-1", email: "u@example.com", role: "student" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/notifications/fcm-tokens", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/notifications/fcm-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("registers a token for the signed-in user", async () => {
    registerToken.mockResolvedValue({ id: "tok-1", token: "t", userAgent: null, createdAt: 1, updatedAt: 1 });

    const res = await POST(makeRequest({ token: "t" }));

    expect(res.status).toBe(200);
    expect(registerToken).toHaveBeenCalledWith(session, { token: "t" });
  });

  it("rejects an empty token", async () => {
    const res = await POST(makeRequest({ token: "" }));
    expect(res.status).toBe(400);
    expect(registerToken).not.toHaveBeenCalled();
  });
});

describe("GET /api/notifications/fcm-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSession.mockResolvedValue(session);
  });

  it("returns the caller's own tokens", async () => {
    listMyTokens.mockResolvedValue([{ id: "tok-1" }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tokens).toEqual([{ id: "tok-1" }]);
    expect(listMyTokens).toHaveBeenCalledWith(session);
  });
});
