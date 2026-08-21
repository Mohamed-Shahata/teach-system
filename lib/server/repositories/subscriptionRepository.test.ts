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

const { subscriptionRepository } = await import("./subscriptionRepository");

describe("subscriptionRepository.listActiveStudentIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a deduplicated set of studentIds with an active subscription", async () => {
    getQuery.mockResolvedValue({
      docs: [
        { data: () => ({ studentId: "student-1" }) },
        { data: () => ({ studentId: "student-2" }) },
        // Same student subscribed to two different teachers/offerings —
        // must still collapse to one entry in the set.
        { data: () => ({ studentId: "student-1" }) },
      ],
    });

    const result = await subscriptionRepository.listActiveStudentIds();

    expect(collection).toHaveBeenCalledWith("subscriptions");
    expect(where).toHaveBeenCalledWith("status", "==", "active");
    expect(result).toEqual(new Set(["student-1", "student-2"]));
  });

  it("returns an empty set when no student has an active subscription", async () => {
    getQuery.mockResolvedValue({ docs: [] });
    const result = await subscriptionRepository.listActiveStudentIds();
    expect(result.size).toBe(0);
  });
});

describe("subscriptionRepository.markRenewalNotified", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records lastRenewalNotifiedPeriod on the subscription doc", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const doc = vi.fn(() => ({ update }));
    collection.mockReturnValueOnce({ doc } as unknown as ReturnType<typeof collection>);

    await subscriptionRepository.markRenewalNotified("sub-1", "2026-08");

    expect(doc).toHaveBeenCalledWith("sub-1");
    expect(update).toHaveBeenCalledWith({ lastRenewalNotifiedPeriod: "2026-08" });
  });
});
