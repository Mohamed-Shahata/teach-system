import { beforeEach, describe, expect, it, vi } from "vitest";

const listSubscriptionsDueForRenewal = vi.fn();
const currentPeriod = vi.fn(() => "2026-08");
vi.mock("@/lib/server/services/subscriptionRenewalQuery", () => ({
  listSubscriptionsDueForRenewal,
  currentPeriod,
}));

const markRenewalNotified = vi.fn();
vi.mock("@/lib/server/repositories/subscriptionRepository", () => ({
  subscriptionRepository: { markRenewalNotified },
}));

const notify = vi.fn();
vi.mock("@/lib/server/services/auditNotificationService", () => ({
  auditNotificationService: { notify },
}));

const { runSubscriptionRenewalNotificationsJob } = await import("./subscriptionRenewalNotificationsJob");

describe("runSubscriptionRenewalNotificationsJob", () => {
  beforeEach(() => vi.clearAllMocks());

  it("notifies each due subscription's student and marks it notified for the period", async () => {
    listSubscriptionsDueForRenewal.mockResolvedValue([
      { id: "sub-1", studentId: "s1", teacherId: "t1", createdAt: 1 },
      { id: "sub-2", studentId: "s2", teacherId: "t2", createdAt: 2 },
    ]);

    const result = await runSubscriptionRenewalNotificationsJob();

    expect(listSubscriptionsDueForRenewal).toHaveBeenCalledWith("2026-08");
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ entityId: "sub-1", recipientIds: ["s1"] }));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ entityId: "sub-2", recipientIds: ["s2"] }));
    expect(markRenewalNotified).toHaveBeenCalledWith("sub-1", "2026-08");
    expect(markRenewalNotified).toHaveBeenCalledWith("sub-2", "2026-08");
    expect(result).toEqual({ notified: 2 });
  });

  it("no-duplicate guard: skips a subscription already notified for the current period", async () => {
    listSubscriptionsDueForRenewal.mockResolvedValue([
      { id: "sub-1", studentId: "s1", teacherId: "t1", createdAt: 1, lastRenewalNotifiedPeriod: "2026-08" },
      { id: "sub-2", studentId: "s2", teacherId: "t2", createdAt: 2, lastRenewalNotifiedPeriod: "2026-07" },
    ]);

    const result = await runSubscriptionRenewalNotificationsJob();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ entityId: "sub-2" }));
    expect(markRenewalNotified).toHaveBeenCalledTimes(1);
    expect(markRenewalNotified).toHaveBeenCalledWith("sub-2", "2026-08");
    expect(result).toEqual({ notified: 1 });
  });

  it("does nothing when no subscription is due", async () => {
    listSubscriptionsDueForRenewal.mockResolvedValue([]);
    const result = await runSubscriptionRenewalNotificationsJob();
    expect(notify).not.toHaveBeenCalled();
    expect(result).toEqual({ notified: 0 });
  });
});
