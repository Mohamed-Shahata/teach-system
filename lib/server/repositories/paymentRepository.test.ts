import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const createDoc = vi.fn();
const updateDoc = vi.fn();
const docId = vi.fn(() => "payment-1");
const doc = vi.fn(() => ({ id: docId(), get: getDoc, create: createDoc, update: updateDoc }));
const where = vi.fn();
const getQuery = vi.fn();
const collection = vi.fn(() => {
  const query = { where, get: getQuery, doc };
  where.mockReturnValue(query);
  return query;
});

vi.mock("@/lib/server/firebaseAdmin", () => ({
  adminDb: { collection },
}));

const { paymentRepository } = await import("./paymentRepository");
const { NotFoundError } = await import("@/lib/errors");
const { assertWritableByTeacher } = await import("./base");

function makeSession(role: "admin" | "teacher" | "student", uid = "teacher-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const rawPaymentData = {
  studentId: "student-1",
  courseId: "course-1",
  teacherId: "teacher-1",
  amount: 300,
  currency: "EGP",
  method: "vodafone_cash",
  status: "pending",
  referenceNote: "01000000000",
  createdAt: 1000,
  updatedAt: 1000,
};

describe("paymentRepository.findById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps a Firestore doc into a PaymentDoc", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "payment-1", data: () => rawPaymentData });

    await expect(paymentRepository.findById("payment-1")).resolves.toEqual({
      id: "payment-1",
      ...rawPaymentData,
    });
  });

  it("returns null when missing", async () => {
    getDoc.mockResolvedValue({ exists: false });
    await expect(paymentRepository.findById("nope")).resolves.toBeNull();
  });
});

describe("paymentRepository.update", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when the payment doesn't exist", async () => {
    getDoc.mockResolvedValue({ exists: false });
    await expect(
      paymentRepository.update(makeSession("teacher"), "payment-1", { status: "confirmed", updatedAt: 2 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a teacher updating another teacher's payment", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "payment-1", data: () => rawPaymentData });
    await expect(
      paymentRepository.update(makeSession("teacher", "someone-else"), "payment-1", {
        status: "confirmed",
        updatedAt: 2,
      }),
    ).rejects.toThrow();
  });

  it("applies the patch for the owning teacher", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "payment-1", data: () => rawPaymentData });
    updateDoc.mockResolvedValue(undefined);

    const result = await paymentRepository.update(makeSession("teacher", "teacher-1"), "payment-1", {
      status: "confirmed",
      updatedAt: 2,
    });

    expect(updateDoc).toHaveBeenCalledWith({ status: "confirmed", updatedAt: 2 });
    expect(result.status).toBe("confirmed");
  });
});

describe("paymentRepository.markSucceeded", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets status to succeeded without requiring a teacher/admin session", async () => {
    getDoc.mockResolvedValue({ exists: true, id: "payment-1", data: () => rawPaymentData });
    updateDoc.mockResolvedValue(undefined);

    const result = await paymentRepository.markSucceeded("payment-1", "txn-123");

    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ status: "succeeded", gatewayTransactionId: "txn-123" }),
    );
    expect(result.status).toBe("succeeded");
  });
});

// `assertWritableByTeacher` itself already has full coverage in base.test.ts;
// imported here only to keep this file's "rejects another teacher" case
// honest about which helper is doing the rejecting.
void assertWritableByTeacher;
