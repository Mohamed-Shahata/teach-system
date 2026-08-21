import { beforeEach, describe, expect, it, vi } from "vitest";

const listByRole = vi.fn();
vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { listByRole },
}));

const listForTeacherPayments = vi.fn();
vi.mock("@/lib/server/services/paymentService", () => ({
  paymentService: { listForTeacher: listForTeacherPayments },
}));

const listForTeacherInvoices = vi.fn();
vi.mock("@/lib/server/services/subscriptionInvoiceService", () => ({
  subscriptionInvoiceService: { listForTeacher: listForTeacherInvoices },
}));

const { adminOverviewService } = await import("./adminOverviewService");
const { ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "uid-1") {
  return { uid, email: `${uid}@example.com`, role };
}

describe("adminOverviewService.getRecentActivity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a non-admin session", async () => {
    await expect(adminOverviewService.getRecentActivity(makeSession("teacher"))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(listByRole).not.toHaveBeenCalled();
  });

  it("returns at most 5 recently joined students, newest first", async () => {
    const students = Array.from({ length: 7 }, (_, i) => ({
      uid: `student-${i}`,
      displayName: `Student ${i}`,
      email: `student${i}@example.com`,
      createdAt: i,
    }));
    listByRole.mockResolvedValue(students);
    listForTeacherPayments.mockResolvedValue([]);
    listForTeacherInvoices.mockResolvedValue([]);

    const result = await adminOverviewService.getRecentActivity(makeSession("admin"));

    expect(listByRole).toHaveBeenCalledWith("student");
    expect(result.recentStudents).toHaveLength(5);
    expect(result.recentStudents[0].uid).toBe("student-6");
    expect(result.recentStudents[4].uid).toBe("student-2");
  });

  it("merges payments and subscription invoices, sorted by recency, capped at 5", async () => {
    listByRole.mockResolvedValue([]);
    listForTeacherPayments.mockResolvedValue([
      { id: "payment-1", studentId: "s1", amount: 100, currency: "EGP", status: "succeeded", createdAt: 10 },
      { id: "payment-2", studentId: "s2", amount: 200, currency: "EGP", status: "pending", createdAt: 30 },
    ]);
    listForTeacherInvoices.mockResolvedValue([
      { id: "invoice-1", studentId: "s3", amount: 300, currency: "EGP", status: "confirmed", createdAt: 20 },
    ]);

    const result = await adminOverviewService.getRecentActivity(makeSession("admin"));

    expect(result.recentPayments).toHaveLength(3);
    expect(result.recentPayments.map((p) => p.id)).toEqual(["payment-2", "invoice-1", "payment-1"]);
    expect(result.recentPayments[1].source).toBe("subscriptionInvoice");
  });
});
