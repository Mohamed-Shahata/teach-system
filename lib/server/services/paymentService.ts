import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { courseRepository } from "@/lib/server/repositories/courseRepository";
import { paymentRepository, type PaymentDoc } from "@/lib/server/repositories/paymentRepository";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import { auditNotificationService } from "@/lib/server/services/auditNotificationService";
import type { CreatePaymentInput, PaymentStatus } from "@/lib/validation/payment.schema";

/**
 * Payment service — TASK-1104. Implements the `pending → succeeded /
 * confirmed / rejected` state machine described in
 * `docs/features/payments.md` and `docs/database/collections.md`.
 *
 * Confirming a manual payment or receiving a `succeeded` webhook triggers
 * `enrollmentService.createEnrollment` (TASK-1101, wired in below) — see
 * that service for why it's safe to call even on a retried webhook.
 */

const MANUAL_METHODS = new Set(["vodafone_cash", "bank_transfer"]);

function assertPending(payment: PaymentDoc): void {
  if (payment.status !== "pending") {
    throw new ValidationError();
  }
}

export const paymentService = {
  /** A student's own payment history. */
  async listMyPayments(session: Session, status?: PaymentStatus) {
    assertRole(session, "student");
    return paymentRepository.listByStudent(session.uid, status);
  },

  /** A teacher's (or Admin's) payments — e.g. the pending manual-review queue (TASK-704). */
  async listForTeacher(session: Session, status?: PaymentStatus) {
    assertRole(session, "teacher", "admin");
    return paymentRepository.listByTeacher(session, status);
  },

  async getPayment(session: Session, id: string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError();
    if (session.role === "admin") return payment;
    if (session.role === "student" && payment.studentId === session.uid) return payment;
    if (session.role === "teacher" && payment.teacherId === session.uid) return payment;
    throw new ForbiddenError();
  },

  /**
   * Student creates a `pending` payment for a paid course. Amount and
   * currency are always taken from the course's own stored price — never
   * from client input (`features/payments.md` security notes).
   */
  async createPayment(session: Session, input: CreatePaymentInput): Promise<PaymentDoc> {
    assertRole(session, "student");
    const course = await courseRepository.findById(input.courseId);
    if (!course || course.status !== "published") {
      throw new NotFoundError();
    }
    if (course.enrollmentType !== "paid" || course.price === undefined) {
      throw new ValidationError();
    }
    if (MANUAL_METHODS.has(input.method) && !input.referenceNote) {
      throw new ValidationError();
    }

    const now = Date.now();
    const payment = await paymentRepository.create({
      studentId: session.uid,
      courseId: course.id,
      teacherId: course.teacherId,
      amount: course.price,
      currency: course.currency ?? "EGP",
      method: input.method,
      status: "pending",
      ...(input.referenceNote ? { referenceNote: input.referenceNote } : {}),
      createdAt: now,
      updatedAt: now,
    });
    await auditNotificationService.notify({
      action: "created",
      entityType: "payment",
      entityId: payment.id,
      title: { en: "New payment submitted", ar: "تم تقديم دفعة جديدة" },
      recipientIds: [session.uid, course.teacherId],
    });
    return payment;
  },

  /** Owning teacher or Admin confirms a `pending` manual payment. */
  async confirmManualPayment(session: Session, id: string): Promise<PaymentDoc> {
    assertRole(session, "teacher", "admin");
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError();
    assertPending(payment);
    if (!MANUAL_METHODS.has(payment.method)) {
      throw new ValidationError();
    }

    const updated = await paymentRepository.update(session, id, {
      status: "confirmed",
      confirmedBy: { uid: session.uid, role: session.role as "admin" | "teacher" },
      updatedAt: Date.now(),
    });

    await enrollmentService.createEnrollment({
      studentId: updated.studentId,
      courseId: updated.courseId,
      teacherId: updated.teacherId,
    });

    await auditNotificationService.notify({
      action: "updated",
      entityType: "payment",
      entityId: updated.id,
      title: { en: "Payment confirmed", ar: "تم تأكيد الدفعة" },
      recipientIds: [updated.studentId],
    });

    return updated;
  },

  /** Owning teacher or Admin rejects a `pending` manual payment. */
  async rejectManualPayment(session: Session, id: string): Promise<PaymentDoc> {
    assertRole(session, "teacher", "admin");
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError();
    assertPending(payment);
    if (!MANUAL_METHODS.has(payment.method)) {
      throw new ValidationError();
    }

    const updated = await paymentRepository.update(session, id, {
      status: "rejected",
      confirmedBy: { uid: session.uid, role: session.role as "admin" | "teacher" },
      updatedAt: Date.now(),
    });

    await auditNotificationService.notify({
      action: "updated",
      entityType: "payment",
      entityId: updated.id,
      title: { en: "Payment rejected", ar: "تم رفض الدفعة" },
      recipientIds: [updated.studentId],
    });

    return updated;
  },

  /**
   * System transition from the (future, TASK-1105) gateway webhook, after
   * it has verified the provider's signature. Not session-gated — see
   * `paymentRepository.markSucceeded`.
   */
  async markPaymentSucceeded(id: string, gatewayTransactionId?: string): Promise<PaymentDoc> {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError();
    assertPending(payment);

    const updated = await paymentRepository.markSucceeded(id, gatewayTransactionId);

    await enrollmentService.createEnrollment({
      studentId: updated.studentId,
      courseId: updated.courseId,
      teacherId: updated.teacherId,
    });

    await auditNotificationService.notify({
      action: "updated",
      entityType: "payment",
      entityId: updated.id,
      title: { en: "Payment succeeded", ar: "تمت عملية الدفع بنجاح" },
      recipientIds: [updated.studentId],
    });

    return updated;
  },
};
