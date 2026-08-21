import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSession = vi.fn();
const list = vi.fn();

vi.mock("@/lib/auth/session", () => ({ requireSession }));
vi.mock("@/lib/server/services/adminSubscriptionsDueForRenewalService", () => ({
  adminSubscriptionsDueForRenewalService: { list },
}));

const { GET } = await import("./route");
const { ForbiddenError } = await import("@/lib/errors");

describe("GET /api/admin/subscriptions/due-for-renewal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists subscriptions due for renewal", async () => {
    requireSession.mockResolvedValue({ uid: "admin-1", email: "a@b.com", role: "admin" });
    list.mockResolvedValue([{ subscriptionId: "sub-1" }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ subscriptions: [{ subscriptionId: "sub-1" }] });
    expect(list).toHaveBeenCalledWith({ uid: "admin-1", email: "a@b.com", role: "admin" });
  });

  it("returns 403 for a non-admin session", async () => {
    requireSession.mockResolvedValue({ uid: "teacher-1", email: "t@b.com", role: "teacher" });
    list.mockRejectedValue(new ForbiddenError());

    const res = await GET();

    expect(res.status).toBe(403);
  });
});
