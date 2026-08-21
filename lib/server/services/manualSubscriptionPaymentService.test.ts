import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserById = vi.fn();
const findOfferingById = vi.fn();

vi.mock("@/lib/server/repositories/userRepository", () => ({
  userRepository: { findById: findUserById },
}));
vi.mock("@/lib/server/repositories/teacherOfferingRepository", () => ({
  teacherOfferingRepository: { findById: findOfferingById },
}));

const notify = vi.fn();
vi.mock("@/lib/server/services/auditNotificationService", () => ({
  auditNotificationService: { notify },
}));

const where = vi.fn();
const limit = vi.fn();
const txGet = vi.fn();
const txCreate = vi.fn();
const docIdCounter = { current: 0 };
const doc = vi.fn((id?: string) => ({ id: id ?? `generated-${++docIdCounter.current}` }));
const collection = vi.fn(() => {
  const query = { where, limit, doc };
  where.mockReturnValue(query);
  limit.mockReturnValue(query);
  return query;
});
const runTransaction = vi.fn(async (fn: (tx: { get: typeof txGet; create: typeof txCreate }) => unknown) =>
  fn({ get: txGet, create: txCreate }),
);

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection, runTransaction },
}));

const { manualSubscriptionPaymentService } = await import("./manualSubscriptionPaymentService");
const { ConflictError, ForbiddenError, NotFoundError, ValidationError } = await import("@/lib/errors");

const admin = { uid: "admin-1", email: "a@b.com", role: "admin" as const };
const student = { uid: "student-1", role: "student", stageId: "stage-1" };
const offering = {
  id: "offering-1",
  teacherId: "teacher-1",
  subjectId: "subject-1",
  stageId: "stage-1",
  monthlyPrice: 350,
};

const input = { studentId: "student-1", teacherId: "teacher-1", offeringId: "offering-1", period: "2026-08" };

describe("manualSubscriptionPaymentService.recordCashPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docIdCounter.current = 0;
    findUserById.mockResolvedValue(student);
    findOfferingById.mockResolvedValue(offering);
  });

  it("rejects a non-admin session", async () => {
    await expect(
      manualSubscriptionPaymentService.recordCashPayment({ ...admin, role: "teacher" }, input),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("404s when the student doesn't exist or isn't a student", async () => {
    findUserById.mockResolvedValue(null);
    await expect(manualSubscriptionPaymentService.recordCashPayment(admin, input)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("404s when the offering doesn't exist or belongs to a different teacher", async () => {
    findOfferingById.mockResolvedValue({ ...offering, teacherId: "other-teacher" });
    await expect(manualSubscriptionPaymentService.recordCashPayment(admin, input)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects a stage mismatch between the student and the offering", async () => {
    findUserById.mockResolvedValue({ ...student, stageId: "other-stage" });
    await expect(manualSubscriptionPaymentService.recordCashPayment(admin, input)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("creates a new active subscription and a confirmed invoice when the student has none yet", async () => {
    txGet.mockResolvedValueOnce({ docs: [] }); // no existing active subscription

    const result = await manualSubscriptionPaymentService.recordCashPayment(admin, input);

    expect(txCreate).toHaveBeenCalledTimes(2);
    const [subCall, invoiceCall] = txCreate.mock.calls;
    expect(subCall[1]).toMatchObject({ studentId: "student-1", offeringId: "offering-1", status: "active" });
    expect(invoiceCall[1]).toMatchObject({
      status: "confirmed",
      method: "cash",
      amount: 350,
      period: "2026-08",
      confirmedBy: { uid: "admin-1", role: "admin" },
    });
    expect(result.subscription.status).toBe("active");
    expect(result.invoice.status).toBe("confirmed");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "subscriptionInvoice",
        recipientIds: ["student-1"],
      }),
    );
  });

  it("reuses an existing active subscription instead of creating a new one", async () => {
    txGet
      .mockResolvedValueOnce({
        docs: [{ id: "sub-1", data: () => ({ studentId: "student-1", offeringId: "offering-1", status: "active" }) }],
      })
      .mockResolvedValueOnce({ docs: [], empty: true }); // no invoice yet for this period

    const result = await manualSubscriptionPaymentService.recordCashPayment(admin, input);

    expect(txCreate).toHaveBeenCalledTimes(1); // only the invoice, not the subscription
    expect(result.subscription.id).toBe("sub-1");
    expect(result.invoice.subscriptionId).toBe("sub-1");
  });

  it("conflicts instead of double-billing when an invoice already exists for the period", async () => {
    txGet
      .mockResolvedValueOnce({
        docs: [{ id: "sub-1", data: () => ({ studentId: "student-1", offeringId: "offering-1", status: "active" }) }],
      })
      .mockResolvedValueOnce({ docs: [{ id: "invoice-1" }], empty: false });

    await expect(manualSubscriptionPaymentService.recordCashPayment(admin, input)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(txCreate).not.toHaveBeenCalled();
  });
});
