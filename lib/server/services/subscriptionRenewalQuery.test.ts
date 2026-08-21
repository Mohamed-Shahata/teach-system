import { beforeEach, describe, expect, it, vi } from "vitest";

const listAllActive = vi.fn();
vi.mock("@/lib/server/repositories/subscriptionRepository", () => ({
  subscriptionRepository: { listAllActive },
}));

const listConfirmedSubscriptionIdsForPeriod = vi.fn();
vi.mock("@/lib/server/repositories/subscriptionInvoiceRepository", () => ({
  subscriptionInvoiceRepository: { listConfirmedSubscriptionIdsForPeriod },
}));

const { listSubscriptionsDueForRenewal, currentPeriod } = await import("./subscriptionRenewalQuery");

const THIS_MONTH_UTC = Date.UTC(2026, 7, 15); // 2026-08-15 — "today"
const LAST_MONTH_UTC = Date.UTC(2026, 6, 10); // 2026-07-10 — an old, renewable subscription
const EARLIER_THIS_MONTH_UTC = Date.UTC(2026, 7, 1); // 2026-08-01 — created this month, not due yet

describe("listSubscriptionsDueForRenewal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(THIS_MONTH_UTC);
  });

  it("currentPeriod() reflects the system clock in UTC YYYY-MM", () => {
    expect(currentPeriod()).toBe("2026-08");
  });

  it("excludes a subscription that already has a confirmed invoice this period", async () => {
    listAllActive.mockResolvedValue([
      { id: "sub-1", studentId: "s1", teacherId: "t1", createdAt: LAST_MONTH_UTC },
    ]);
    listConfirmedSubscriptionIdsForPeriod.mockResolvedValue(new Set(["sub-1"]));

    const result = await listSubscriptionsDueForRenewal();

    expect(listConfirmedSubscriptionIdsForPeriod).toHaveBeenCalledWith("2026-08");
    expect(result).toEqual([]);
  });

  it("includes an old subscription with no confirmed invoice this period", async () => {
    listAllActive.mockResolvedValue([
      { id: "sub-1", studentId: "s1", teacherId: "t1", createdAt: LAST_MONTH_UTC },
    ]);
    listConfirmedSubscriptionIdsForPeriod.mockResolvedValue(new Set());

    const result = await listSubscriptionsDueForRenewal();

    expect(result.map((s) => s.id)).toEqual(["sub-1"]);
  });

  it("edge case: excludes a brand-new subscription created earlier this same month", async () => {
    listAllActive.mockResolvedValue([
      { id: "sub-new", studentId: "s2", teacherId: "t2", createdAt: EARLIER_THIS_MONTH_UTC },
    ]);
    listConfirmedSubscriptionIdsForPeriod.mockResolvedValue(new Set());

    const result = await listSubscriptionsDueForRenewal();

    expect(result).toEqual([]);
  });

  it("accepts an explicit period override instead of the current one", async () => {
    listAllActive.mockResolvedValue([]);
    listConfirmedSubscriptionIdsForPeriod.mockResolvedValue(new Set());

    await listSubscriptionsDueForRenewal("2025-01");

    expect(listConfirmedSubscriptionIdsForPeriod).toHaveBeenCalledWith("2025-01");
  });
});
