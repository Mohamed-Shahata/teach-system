import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  subscriptionInvoiceRepository,
  type SubscriptionInvoiceDoc,
} from "@/lib/server/repositories/subscriptionInvoiceRepository";
import { subscriptionRepository } from "@/lib/server/repositories/subscriptionRepository";
import { teacherOfferingRepository } from "@/lib/server/repositories/teacherOfferingRepository";
import { auditNotificationService } from "@/lib/server/services/auditNotificationService";
import type { GenerateInvoiceInput, ReviewInvoiceInput } from "@/lib/validation/subscriptionInvoice.schema";

/**
 * Subscription billing — Phase 3. Turns an active `subscriptions/{id}`
 * (Phase 2) into a monthly `subscriptionInvoices/{id}` record, priced from
 * the subscription's `teacherOfferings.monthlyPrice` (never client input,
 * same rule `paymentService.createPayment` follows for course prices).
 *
 * Deliberately its own service rather than folded into `paymentService`:
 * a subscription invoice isn't tied to a `course`/`enrollment`, and
 * confirming one does not call `enrollmentService` — it only marks the
 * bill paid. The Admin/teacher manual review flow otherwise mirrors
 * `paymentService.confirmManualPayment` / `rejectManualPayment` on purpose.
 */

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function assertPending(invoice: SubscriptionInvoiceDoc): void {
  if (invoice.status !== "pending") {
    throw new ValidationError();
  }
}

export const subscriptionInvoiceService = {
  /** Admin: every invoice ever generated for one subscription (billing history). */
  async listForSubscription(session: Session, subscriptionId: string): Promise<SubscriptionInvoiceDoc[]> {
    assertRole(session, "admin");
    return subscriptionInvoiceRepository.listBySubscription(subscriptionId);
  },

  /** A student's own invoice history, across all their subscriptions. */
  async listForStudent(session: Session): Promise<SubscriptionInvoiceDoc[]> {
    assertRole(session, "student");
    return subscriptionInvoiceRepository.listByStudent(session.uid);
  },

  /** A teacher's (or Admin's) invoice queue — e.g. the pending manual-review list. */
  async listForTeacher(session: Session, status?: SubscriptionInvoiceDoc["status"]) {
    assertRole(session, "teacher", "admin");
    return subscriptionInvoiceRepository.listByTeacher(session, status);
  },

  async getInvoice(session: Session, id: string): Promise<SubscriptionInvoiceDoc> {
    const invoice = await subscriptionInvoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError();
    if (session.role === "admin") return invoice;
    if (session.role === "student" && invoice.studentId === session.uid) return invoice;
    if (session.role === "teacher" && invoice.teacherId === session.uid) return invoice;
    throw new ForbiddenError();
  },

  /**
   * Admin generates this month's (or an explicit `period`'s) bill for an
   * active subscription. Idempotent per `(subscriptionId, period)` — a
   * second call for the same month conflicts instead of double-billing.
   */
  async generateInvoice(
    session: Session,
    subscriptionId: string,
    input: GenerateInvoiceInput,
  ): Promise<SubscriptionInvoiceDoc> {
    assertRole(session, "admin");

    const subscription = await subscriptionRepository.findById(subscriptionId);
    if (!subscription) throw new NotFoundError();
    if (subscription.status !== "active") throw new ValidationError();

    const offering = await teacherOfferingRepository.findById(subscription.offeringId);
    if (!offering) throw new NotFoundError();

    const period = input.period ?? currentPeriod();
    const existing = await subscriptionInvoiceRepository.findBySubscriptionAndPeriod(subscriptionId, period);
    if (existing) throw new ConflictError();

    const now = Date.now();
    return subscriptionInvoiceRepository.create({
      subscriptionId,
      studentId: subscription.studentId,
      teacherId: subscription.teacherId,
      offeringId: subscription.offeringId,
      period,
      amount: offering.monthlyPrice,
      currency: "EGP",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },

  /**
   * Generates this month's invoice for every active subscription at once —
   * the "run monthly billing" bulk action. Skips subscriptions that
   * already have an invoice for the period instead of failing the whole
   * batch, and returns what it actually created.
   */
  async generateForAllActiveSubscriptions(session: Session, period?: string): Promise<SubscriptionInvoiceDoc[]> {
    assertRole(session, "admin");
    const targetPeriod = period ?? currentPeriod();
    const active = await subscriptionRepository.listAllActive();

    const created: SubscriptionInvoiceDoc[] = [];
    for (const subscription of active) {
      const existing = await subscriptionInvoiceRepository.findBySubscriptionAndPeriod(
        subscription.id,
        targetPeriod,
      );
      if (existing) continue;

      const offering = await teacherOfferingRepository.findById(subscription.offeringId);
      if (!offering) continue;

      const now = Date.now();
      created.push(
        await subscriptionInvoiceRepository.create({
          subscriptionId: subscription.id,
          studentId: subscription.studentId,
          teacherId: subscription.teacherId,
          offeringId: subscription.offeringId,
          period: targetPeriod,
          amount: offering.monthlyPrice,
          currency: "EGP",
          status: "pending",
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    return created;
  },

  /** Owning teacher or Admin confirms a `pending` invoice as paid. */
  async confirmInvoice(session: Session, id: string, input: ReviewInvoiceInput): Promise<SubscriptionInvoiceDoc> {
    assertRole(session, "teacher", "admin");
    const invoice = await subscriptionInvoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError();
    assertPending(invoice);

    const updated = await subscriptionInvoiceRepository.update(session, id, {
      status: "confirmed",
      ...(input.method ? { method: input.method } : {}),
      ...(input.referenceNote ? { referenceNote: input.referenceNote } : {}),
      confirmedBy: { uid: session.uid, role: session.role as "admin" | "teacher" },
      updatedAt: Date.now(),
    });

    // TASK-3405(a) — same "payment confirmed" notification
    // `paymentService.confirmManualPayment` sends for course payments,
    // for the subscription-invoice side of manual review.
    await auditNotificationService.notify({
      action: "updated",
      entityType: "subscriptionInvoice",
      entityId: updated.id,
      title: { en: "Payment confirmed", ar: "تم تأكيد الدفعة" },
      recipientIds: [updated.studentId],
      link: "/student/dashboard",
    });

    return updated;
  },

  /** Owning teacher or Admin rejects a `pending` invoice (e.g. no-show payment). */
  async rejectInvoice(session: Session, id: string, input: ReviewInvoiceInput): Promise<SubscriptionInvoiceDoc> {
    assertRole(session, "teacher", "admin");
    const invoice = await subscriptionInvoiceRepository.findById(id);
    if (!invoice) throw new NotFoundError();
    assertPending(invoice);

    return subscriptionInvoiceRepository.update(session, id, {
      status: "rejected",
      ...(input.referenceNote ? { referenceNote: input.referenceNote } : {}),
      confirmedBy: { uid: session.uid, role: session.role as "admin" | "teacher" },
      updatedAt: Date.now(),
    });
  },

  /** Review entry point used by the PATCH route — dispatches confirm/reject. */
  async reviewInvoice(session: Session, id: string, input: ReviewInvoiceInput): Promise<SubscriptionInvoiceDoc> {
    return input.status === "confirmed"
      ? this.confirmInvoice(session, id, input)
      : this.rejectInvoice(session, id, input);
  },
};
