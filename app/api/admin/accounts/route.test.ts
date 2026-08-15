import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const createAccountByAdmin = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/accountService", () => ({
  accountService: { createAccountByAdmin },
}));

const { POST } = await import("./route");
const { UnauthorizedError, ForbiddenError } = await import("@/lib/errors");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/accounts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the account and returns 201", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    createAccountByAdmin.mockResolvedValue({
      uid: "new-uid",
      email: "mona@example.com",
      displayName: "Mona",
      role: "teacher",
      resetLink: "https://example.com/reset",
    });

    const res = await POST(
      makeRequest({ role: "teacher", email: "mona@example.com", displayName: "Mona" }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.uid).toBe("new-uid");
    expect(createAccountByAdmin).toHaveBeenCalledWith(
      { uid: "admin-1", email: "a@b.com", role: "admin" },
      expect.objectContaining({ role: "teacher", email: "mona@example.com" }),
    );
  });

  it("returns 401 when there is no session", async () => {
    requireSession.mockRejectedValue(new UnauthorizedError());

    const res = await POST(makeRequest({ role: "student", email: "x@y.com", displayName: "X" }));

    expect(res.status).toBe(401);
    expect(createAccountByAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 when the service rejects the role (non-admin session)", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    createAccountByAdmin.mockRejectedValue(new ForbiddenError());

    const res = await POST(
      makeRequest({ role: "student", email: "sara@example.com", displayName: "Sara", stageId: "s1" }),
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid body (student role missing stageId)", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await POST(
      makeRequest({ role: "student", email: "sara@example.com", displayName: "Sara" }),
    );

    expect(res.status).toBe(400);
    expect(createAccountByAdmin).not.toHaveBeenCalled();
  });
});
