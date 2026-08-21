import { beforeEach, describe, expect, it, vi } from "vitest";

const findById = vi.fn();
const listByStudent = vi.fn();
const listByTeacher = vi.fn();
const create = vi.fn();
const update = vi.fn();
const markSucceeded = vi.fn();

vi.mock("@/lib/server/repositories/paymentRepository", () => ({
  paymentRepository: { findById, listByStudent, listByTeacher, create, update, markSucceeded },
}));

const findCourseById = vi.fn();

vi.mock("@/lib/server/repositories/courseRepository", () => ({
  courseRepository: { findById: findCourseById },
}));

const createEnrollment = vi.fn();

vi.mock("@/lib/server/services/enrollmentService", () => ({
  enrollmentService: { createEnrollment },
}));

const auditNotify = vi.fn();
vi.mock("@/lib/server/services/auditNotificationService", () => ({
  auditNotificationService: { notify: auditNotify },
}));

const { paymentService } = await import("./paymentService");
const { ForbiddenError, NotFoundError, ValidationError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "uid-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const publishedPaidCourse = {
  id: "course-1",
  teacherId: "teacher-1",
  status: "published" as const,
  enrollmentType: "paid" as const,
  price: 300,
  currency: "EGP",
};

const pendingManualPayment = {
  id: "payment-1",
  studentId: "student-1",
  courseId: "course-1",
  teacherId: "teacher-1",
  amount: 300,
  currency: "EGP",
  method: "vodafone_cash" as const,
  status: "pending" as const,
  referenceNote: "01000000000",
  createdAt: 1,
  updatedAt: 1,
};

describe("paymentService.listForStudentAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-admin session", async () => {
    await expect(paymentService.listForStudentAdmin(makeSession("teacher"), "student-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(listByStudent).not.toHaveBeenCalled();
  });

  it("returns the student's full payment history for an admin session", async () => {
    const payments = [{ id: "payment-1", studentId: "student-1" }];
    listByStudent.mockResolvedValue(payments);

    const result = await paymentService.listForStudentAdmin(makeSession("admin"), "student-1");

    expect(listByStudent).toHaveBeenCalledWith("student-1");
    expect(result).toBe(payments);
  });
});

describe("paymentService.createPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCourseById.mockResolvedValue(publishedPaidCourse);
    create.mockImplementation(async (payment) => ({ id: "payment-1", ...payment }));
  });

  it("rejects a non-student session", async () => {
    await expect(
      paymentService.createPayment(makeSession("teacher"), { courseId: "course-1", method: "card" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates a pending payment priced from the course, ignoring any client-supplied amount", async () => {
    const session = makeSession("student", "student-1");

    const payment = await paymentService.createPayment(session, {
      courseId: "course-1",
      method: "vodafone_cash",
      referenceNote: "01000000000",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: "student-1",
        courseId: "course-1",
        teacherId: "teacher-1",
        amount: 300,
        currency: "EGP",
        status: "pending",
      }),
    );
    expect(payment.status).toBe("pending");
  });

  it("rejects a manual method with no reference note", async () => {
    await expect(
      paymentService.createPayment(makeSession("student"), { courseId: "course-1", method: "bank_transfer" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a free course", async () => {
    findCourseById.mockResolvedValue({ ...publishedPaidCourse, enrollmentType: "free", price: undefined });
    await expect(
      paymentService.createPayment(makeSession("student"), { courseId: "course-1", method: "card" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws NotFoundError for a missing or unpublished course", async () => {
    findCourseById.mockResolvedValue(null);
    await expect(
      paymentService.createPayment(makeSession("student"), { courseId: "course-1", method: "card" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("paymentService.confirmManualPayment / rejectManualPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue(pendingManualPayment);
    update.mockImplementation(async (_session, id, patch) => ({ ...pendingManualPayment, id, ...patch }));
    createEnrollment.mockResolvedValue({ id: "enrollment-1" });
  });

  it("confirms a pending manual payment and records confirmedBy", async () => {
    const session = makeSession("teacher", "teacher-1");
    const updated = await paymentService.confirmManualPayment(session, "payment-1");

    expect(update).toHaveBeenCalledWith(
      session,
      "payment-1",
      expect.objectContaining({ status: "confirmed", confirmedBy: { uid: "teacher-1", role: "teacher" } }),
    );
    expect(createEnrollment).toHaveBeenCalledWith({
      studentId: "student-1",
      courseId: "course-1",
      teacherId: "teacher-1",
    });
    expect(updated.status).toBe("confirmed");
  });

  it("rejects a pending manual payment without creating an enrollment", async () => {
    const session = makeSession("admin", "admin-1");
    const updated = await paymentService.rejectManualPayment(session, "payment-1");

    expect(update).toHaveBeenCalledWith(
      session,
      "payment-1",
      expect.objectContaining({ status: "rejected", confirmedBy: { uid: "admin-1", role: "admin" } }),
    );
    expect(createEnrollment).not.toHaveBeenCalled();
    expect(updated.status).toBe("rejected");
  });

  it("refuses to re-confirm an already-settled payment", async () => {
    findById.mockResolvedValue({ ...pendingManualPayment, status: "confirmed" });
    await expect(
      paymentService.confirmManualPayment(makeSession("teacher", "teacher-1"), "payment-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses to confirm an online (card/fawry) payment through the manual-review path", async () => {
    findById.mockResolvedValue({ ...pendingManualPayment, method: "card" });
    await expect(
      paymentService.confirmManualPayment(makeSession("teacher", "teacher-1"), "payment-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a student session", async () => {
    await expect(
      paymentService.confirmManualPayment(makeSession("student"), "payment-1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("paymentService.markPaymentSucceeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue({ ...pendingManualPayment, method: "card" });
    markSucceeded.mockImplementation(async (id, gatewayTransactionId) => ({
      ...pendingManualPayment,
      method: "card",
      status: "succeeded",
      ...(gatewayTransactionId ? { gatewayTransactionId } : {}),
    }));
    createEnrollment.mockResolvedValue({ id: "enrollment-1" });
  });

  it("flips a pending online payment to succeeded with the gateway transaction id", async () => {
    const updated = await paymentService.markPaymentSucceeded("payment-1", "txn-123");
    expect(markSucceeded).toHaveBeenCalledWith("payment-1", "txn-123");
    expect(createEnrollment).toHaveBeenCalledWith({
      studentId: "student-1",
      courseId: "course-1",
      teacherId: "teacher-1",
    });
    expect(updated.status).toBe("succeeded");
  });

  it("refuses to settle an already-settled payment", async () => {
    findById.mockResolvedValue({ ...pendingManualPayment, method: "card", status: "succeeded" });
    await expect(paymentService.markPaymentSucceeded("payment-1")).rejects.toBeInstanceOf(ValidationError);
  });
});
