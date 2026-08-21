import { beforeEach, describe, expect, it, vi } from "vitest";

const where = vi.fn();
const getQuery = vi.fn();
const collection = vi.fn(() => {
  const query = { where, get: getQuery };
  where.mockReturnValue(query);
  return query;
});

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { subscriptionInvoiceRepository } = await import("./subscriptionInvoiceRepository");

describe("subscriptionInvoiceRepository.listConfirmedSubscriptionIdsForPeriod", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the set of subscriptionIds with a confirmed invoice for that period", async () => {
    getQuery.mockResolvedValue({
      docs: [
        { data: () => ({ subscriptionId: "sub-1" }) },
        { data: () => ({ subscriptionId: "sub-2" }) },
      ],
    });

    const result = await subscriptionInvoiceRepository.listConfirmedSubscriptionIdsForPeriod("2026-08");

    expect(collection).toHaveBeenCalledWith("subscriptionInvoices");
    expect(where).toHaveBeenCalledWith("period", "==", "2026-08");
    expect(where).toHaveBeenCalledWith("status", "==", "confirmed");
    expect(result).toEqual(new Set(["sub-1", "sub-2"]));
  });

  it("returns an empty set when nothing is confirmed for that period", async () => {
    getQuery.mockResolvedValue({ docs: [] });
    const result = await subscriptionInvoiceRepository.listConfirmedSubscriptionIdsForPeriod("2026-08");
    expect(result.size).toBe(0);
  });
});
