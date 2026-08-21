import { beforeEach, describe, expect, it, vi } from "vitest";

const listSubscriptionsDueForRenewal = vi.fn();
const currentPeriodMock = vi.fn(() => "2026-08");
vi.mock("@/lib/server/services/subscriptionRenewalQuery", () => ({
  listSubscriptionsDueForRenewal,
  currentPeriod: currentPeriodMock,
}));

const findByIds = vi.fn();
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findByIds },
}));

const { adminSubscriptionsDueForRenewalService } = await import("./adminSubscriptionsDueForRenewalService");
const { ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student" = "admin", uid = "admin-1") {
  return { uid, email: `${uid}@example.com`, role };
}

describe("adminSubscriptionsDueForRenewalService.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 7, 15)); // 2026-08-15
    findByIds.mockResolvedValue(new Map());
  });

  it("rejects a non-admin session", async () => {
    await expect(
      adminSubscriptionsDueForRenewalService.list(makeSession("teacher")),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("maps the shared query's result into rows with joined names, oldest first", async () => {
    listSubscriptionsDueForRenewal.mockResolvedValue([
      { id: "sub-2", studentId: "s2", teacherId: "t2", createdAt: Date.UTC(2026, 5, 1) },
      { id: "sub-1", studentId: "s1", teacherId: "t1", createdAt: Date.UTC(2026, 4, 1) },
    ]);
    findByIds.mockResolvedValue(
      new Map([
        ["s1", { displayName: "Sara" }],
        ["t1", { displayName: "Mr. Ahmed" }],
      ]),
    );

    const result = await adminSubscriptionsDueForRenewalService.list(makeSession());

    expect(listSubscriptionsDueForRenewal).toHaveBeenCalledWith("2026-08");
    expect(result).toEqual([
      {
        subscriptionId: "sub-1",
        studentId: "s1",
        studentName: "Sara",
        teacherId: "t1",
        teacherName: "Mr. Ahmed",
        period: "2026-08",
        subscriptionCreatedAt: Date.UTC(2026, 4, 1),
      },
      {
        subscriptionId: "sub-2",
        studentId: "s2",
        studentName: "s2",
        teacherId: "t2",
        teacherName: "t2",
        period: "2026-08",
        subscriptionCreatedAt: Date.UTC(2026, 5, 1),
      },
    ]);
  });

  it("returns an empty list when nothing is due", async () => {
    listSubscriptionsDueForRenewal.mockResolvedValue([]);
    const result = await adminSubscriptionsDueForRenewalService.list(makeSession());
    expect(result).toEqual([]);
  });
});
