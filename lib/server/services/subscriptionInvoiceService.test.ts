import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const update = vi.fn();
vi.mock("@/lib/server/repositories/subscriptionInvoiceRepository", () => ({
  subscriptionInvoiceRepository: { findById, update },
}));

vi.mock("@/lib/server/repositories/subscriptionRepository", () => ({
  subscriptionRepository: {},
}));
vi.mock("@/lib/server/repositories/teacherOfferingRepository", () => ({
  teacherOfferingRepository: {},
}));

const notify = vi.fn();
vi.mock("@/lib/server/services/auditNotificationService", () => ({
  auditNotificationService: { notify },
}));

const { subscriptionInvoiceService } = await import("./subscriptionInvoiceService");
const { ForbiddenError, NotFoundError, ValidationError } = await import("@/lib/errors");

const admin = { uid: "admin-1", email: "a@b.com", role: "admin" as const };
const pendingInvoice = {
  id: "inv-1",
  subscriptionId: "sub-1",
  studentId: "student-1",
  teacherId: "teacher-1",
  offeringId: "offering-1",
  period: "2026-08",
  amount: 350,
  currency: "EGP",
  status: "pending" as const,
  createdAt: 1,
  updatedAt: 1,
};

describe("subscriptionInvoiceService.confirmInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue(pendingInvoice);
    update.mockResolvedValue({ ...pendingInvoice, status: "confirmed" });
  });

  it("rejects a student session", async () => {
    await expect(
      subscriptionInvoiceService.confirmInvoice({ ...admin, role: "student" }, "inv-1", { status: "confirmed" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("404s when the invoice doesn't exist", async () => {
    findById.mockResolvedValue(null);
    await expect(subscriptionInvoiceService.confirmInvoice(admin, "inv-1", { status: "confirmed" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects confirming an invoice that isn't pending", async () => {
    findById.mockResolvedValue({ ...pendingInvoice, status: "confirmed" });
    await expect(subscriptionInvoiceService.confirmInvoice(admin, "inv-1", { status: "confirmed" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("TASK-3405(a): notifies the student once the invoice is confirmed", async () => {
    const result = await subscriptionInvoiceService.confirmInvoice(admin, "inv-1", { status: "confirmed" });

    expect(result.status).toBe("confirmed");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "subscriptionInvoice",
        entityId: "inv-1",
        recipientIds: ["student-1"],
      }),
    );
  });
});
