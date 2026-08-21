import "server-only";
import type { Session } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { adminDb } from "@/lib/server/firebaseAdmin";
import type { SubscriptionDoc } from "@/lib/server/repositories/subscriptionRepository";
import type { SubscriptionInvoiceDoc } from "@/lib/server/repositories/subscriptionInvoiceRepository";
import { teacherOfferingRepository } from "@/lib/server/repositories/teacherOfferingRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { auditNotificationService } from "@/lib/server/services/auditNotificationService";
import type { ManualSubscriptionPaymentInput } from "@/lib/validation/manualSubscriptionPayment.schema";

const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const INVOICES_COLLECTION = "subscriptionInvoices";

function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * TASK-3402 — the specific flow the Admin performs as one action: a
 * student pays cash for e.g. "Arabic with Ahmed, this month". A thin
 * convenience wrapper around Phase 29's existing subscription/invoice
 * data shapes (not a new payment model) that:
 *  1. reuses the student's existing active subscription to the offering,
 *     or creates (activates) one if none exists yet;
 *  2. creates a `confirmed` invoice for the (current, by default) period.
 *
 * Both reads and both writes happen inside one `runTransaction` so a
 * partial failure can never leave an invoice without its subscription,
 * or vice versa — Firestore transactions require all reads before any
 * writes, so the existing-subscription and existing-invoice-for-period
 * lookups both run first, then either write happens.
 */
export const manualSubscriptionPaymentService = {
  async recordCashPayment(
    session: Session,
    input: ManualSubscriptionPaymentInput,
  ): Promise<{ subscription: SubscriptionDoc; invoice: SubscriptionInvoiceDoc }> {
    assertRole(session, "admin");

    const student = await userRepository.findById(input.studentId);
    if (!student || student.role !== "student") throw new NotFoundError();

    const offering = await teacherOfferingRepository.findById(input.offeringId);
    if (!offering || offering.teacherId !== input.teacherId) throw new NotFoundError();

    // Same rule `subscriptionService.createSubscription` enforces: an
    // offering is priced for one specific grade level.
    if (!student.stageId || student.stageId !== offering.stageId) {
      throw new ValidationError("errors.stageMismatch");
    }

    const period = input.period ?? currentPeriod();
    const subscriptionsCol = adminDb.collection(SUBSCRIPTIONS_COLLECTION);
    const invoicesCol = adminDb.collection(INVOICES_COLLECTION);

    const result = await adminDb.runTransaction(async (tx) => {
      const existingSubSnap = await tx.get(
        subscriptionsCol
          .where("studentId", "==", input.studentId)
          .where("offeringId", "==", offering.id)
          .where("status", "==", "active")
          .limit(1),
      );

      const existingSubDoc = existingSubSnap.docs[0];
      const subscriptionId = existingSubDoc ? existingSubDoc.id : subscriptionsCol.doc().id;

      // Only an already-existing subscription could possibly already have
      // an invoice for this period — a brand-new one can't conflict.
      const existingInvoiceSnap = existingSubDoc
        ? await tx.get(
            invoicesCol.where("subscriptionId", "==", subscriptionId).where("period", "==", period).limit(1),
          )
        : null;
      if (existingInvoiceSnap && !existingInvoiceSnap.empty) {
        throw new ConflictError();
      }

      const now = Date.now();

      let subscription: SubscriptionDoc;
      if (existingSubDoc) {
        subscription = { id: existingSubDoc.id, ...existingSubDoc.data() } as SubscriptionDoc;
      } else {
        const subscriptionData: Omit<SubscriptionDoc, "id"> = {
          studentId: input.studentId,
          teacherId: offering.teacherId,
          offeringId: offering.id,
          subjectId: offering.subjectId,
          stageId: offering.stageId,
          status: "active",
          createdAt: now,
        };
        tx.create(subscriptionsCol.doc(subscriptionId), subscriptionData);
        subscription = { id: subscriptionId, ...subscriptionData };
      }

      const invoiceRef = invoicesCol.doc();
      const invoiceData: Omit<SubscriptionInvoiceDoc, "id"> = {
        subscriptionId: subscription.id,
        studentId: input.studentId,
        teacherId: offering.teacherId,
        offeringId: offering.id,
        period,
        amount: offering.monthlyPrice,
        currency: "EGP",
        status: "confirmed",
        method: "cash",
        confirmedBy: { uid: session.uid, role: "admin" },
        createdAt: now,
        updatedAt: now,
      };
      tx.create(invoiceRef, invoiceData);

      return { subscription, invoice: { id: invoiceRef.id, ...invoiceData } };
    });

    // TASK-3405(a) — outside the transaction (best-effort, non-critical
    // side effect; see `auditNotificationService`'s own docstring for
    // why it never throws), same "payment confirmed" copy
    // `subscriptionInvoiceService.confirmInvoice` sends for the
    // teacher/Admin manual-review path.
    await auditNotificationService.notify({
      action: "updated",
      entityType: "subscriptionInvoice",
      entityId: result.invoice.id,
      title: { en: "Payment confirmed", ar: "تم تأكيد الدفعة" },
      recipientIds: [result.invoice.studentId],
      link: "/student/dashboard",
    });

    return result;
  },
};
