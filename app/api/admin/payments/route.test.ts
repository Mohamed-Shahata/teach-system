import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const listAllPayments = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/adminPaymentsService", () => ({
  adminPaymentsService: { listAllPayments },
}));

const { GET } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("GET /api/admin/payments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists all payments", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    listAllPayments.mockResolvedValue([{ id: "p1" }]);

    const res = await GET(new Request("http://localhost/api/admin/payments"));

    expect(res.status).toBe(200);
    expect(listAllPayments).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, undefined);
  });

  it("passes the status query param through", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    listAllPayments.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/admin/payments?status=pending"));

    expect(listAllPayments).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" }, "pending");
  });

  it("rejects an invalid status value", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });

    const res = await GET(new Request("http://localhost/api/admin/payments?status=bogus"));

    expect(res.status).toBe(400);
    expect(listAllPayments).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    listAllPayments.mockRejectedValue(new ForbiddenError());

    const res = await GET(new Request("http://localhost/api/admin/payments"));

    expect(res.status).toBe(403);
  });
});
