import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { paymentRepository } from "@/lib/server/repositories/paymentRepository";
import { subscriptionInvoiceRepository, type SubscriptionInvoiceDoc } from "@/lib/server/repositories/subscriptionInvoiceRepository";
import { teacherOfferingRepository } from "@/lib/server/repositories/teacherOfferingRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { courseRepository, type LocalizedText } from "@/lib/server/repositories/courseRepository";
import { subjectRepository } from "@/lib/server/repositories/subjectRepository";
import type { PaymentStatus } from "@/lib/validation/payment.schema";

/**
 * TASK-1906 — Center-wide payments oversight for the Admin.
 *
 * Read-only, unlike the teacher's own confirm/reject queue (TASK-704) —
 * "full visibility for support/dispute handling" per
 * `features/admin-dashboard.md`, not a review action. Reuses
 * `paymentService.listForTeacher`'s underlying repository call:
 * `paymentRepository.listByTeacher(session, status)` already returns
 * every teacher's payments, unscoped, for an Admin session (see
 * `repositories/base.ts`'s `scopeToTeacher`) — so this service's only
 * real job is joining student/teacher/course names onto the raw
 * `PaymentDoc`s so the Admin doesn't have to cross-reference uids by
 * hand while triaging a dispute.
 */

export interface AdminPaymentRow {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: LocalizedText;
  teacherId: string;
  teacherName: string;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  referenceNote?: string;
  createdAt: number;
  updatedAt: number;
}

export const adminPaymentsService = {
  async listAllPayments(session: Session, status?: PaymentStatus): Promise<AdminPaymentRow[]> {
    assertRole(session, "admin");
    const payments = await paymentRepository.listByTeacher(session, status);

    const studentIds = payments.map((p) => p.studentId);
    const teacherIds = payments.map((p) => p.teacherId);
    const courseIds = payments.map((p) => p.courseId);

    const [users, courses] = await Promise.all([
      userRepository.findByIds([...studentIds, ...teacherIds]),
      courseRepository.findByIds(courseIds),
    ]);

    return payments.map((payment) => ({
      id: payment.id,
      studentId: payment.studentId,
      studentName: users.get(payment.studentId)?.displayName ?? payment.studentId,
      courseId: payment.courseId,
      courseTitle: courses.get(payment.courseId)?.title ?? { en: payment.courseId, ar: payment.courseId },
      teacherId: payment.teacherId,
      teacherName: users.get(payment.teacherId)?.displayName ?? payment.teacherId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      ...(payment.referenceNote ? { referenceNote: payment.referenceNote } : {}),
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));
  },
};

/**
 * TASK-3401 — combined center-wide payments view: course `payments`
 * (Phase 11) and subscription `subscriptionInvoices` (Phase 29) merged
 * into one shape, so the Admin's new dedicated Payments page doesn't need
 * two separate tables. Status is narrowed to the three values the two
 * models actually share (`pending`/`confirmed`/`rejected`) per this
 * task's acceptance criteria — a gateway `succeeded` payment is a
 * `confirmed`-equivalent terminal success and is normalized to
 * `confirmed` here so a single filter control covers both models
 * consistently; the raw underlying status is not otherwise available on
 * this combined row (use the existing per-model pages — `admin/payments`
 * for the old course-payments-only view and `admin/subscription-invoices`
 * for the review queue — for that level of detail).
 */
export type CombinedPaymentSource = "payment" | "subscriptionInvoice";
export type CombinedPaymentStatus = "pending" | "confirmed" | "rejected";

export interface CombinedPaymentRow {
  id: string;
  source: CombinedPaymentSource;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  /** Course title for a `payment` row, subject name for a `subscriptionInvoice` row (no course to point to). */
  itemLabel: LocalizedText;
  amount: number;
  currency: string;
  method?: string;
  status: CombinedPaymentStatus;
  referenceNote?: string;
  createdAt: number;
  updatedAt: number;
}

function normalizePaymentStatus(status: PaymentStatus): CombinedPaymentStatus {
  return status === "succeeded" ? "confirmed" : status;
}

async function loadInvoiceItemLabels(invoices: SubscriptionInvoiceDoc[]): Promise<Map<string, LocalizedText>> {
  const offerings = await Promise.all(
    invoices.map((invoice) => teacherOfferingRepository.findById(invoice.offeringId)),
  );
  const subjects = await subjectRepository.list();
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));

  const labels = new Map<string, LocalizedText>();
  invoices.forEach((invoice, i) => {
    const offering = offerings[i];
    const subject = offering ? subjectsById.get(offering.subjectId) : undefined;
    labels.set(invoice.id, subject?.name ?? { en: "—", ar: "—" });
  });
  return labels;
}

export const adminPaymentsOverviewService = {
  /**
   * TASK-3401 — one combined, recency-sorted list across both payment
   * models. `status` (when given) filters both models by the same
   * normalized value. Search (by student or teacher name) is left to the
   * client, same as `AdminPaymentsOverview`'s existing status filter —
   * this is a low-traffic Admin page, not worth a second server round
   * trip per keystroke.
   */
  async listAll(session: Session, status?: CombinedPaymentStatus): Promise<CombinedPaymentRow[]> {
    assertRole(session, "admin");

    const [payments, invoices] = await Promise.all([
      status === "confirmed"
        ? paymentRepository.listByTeacher(session)
        : paymentRepository.listByTeacher(session, status),
      status === "confirmed"
        ? subscriptionInvoiceRepository.listByTeacher(session)
        : subscriptionInvoiceRepository.listByTeacher(session, status),
    ]);

    // "confirmed" can't be pushed down as a single repository-level filter
    // (both a "succeeded" payment and a "confirmed" invoice normalize to
    // it), so that one case fetches everything and filters after
    // normalizing; the other two statuses filter server-side as usual.
    const filteredPayments = status ? payments.filter((p) => normalizePaymentStatus(p.status) === status) : payments;
    const filteredInvoices = status
      ? invoices.filter((inv) => normalizePaymentStatus(inv.status as PaymentStatus) === status)
      : invoices;

    const studentIds = [...filteredPayments.map((p) => p.studentId), ...filteredInvoices.map((i) => i.studentId)];
    const teacherIds = [...filteredPayments.map((p) => p.teacherId), ...filteredInvoices.map((i) => i.teacherId)];
    const courseIds = filteredPayments.map((p) => p.courseId);

    const [users, courses, invoiceLabels] = await Promise.all([
      userRepository.findByIds([...studentIds, ...teacherIds]),
      courseRepository.findByIds(courseIds),
      loadInvoiceItemLabels(filteredInvoices),
    ]);

    const paymentRows: CombinedPaymentRow[] = filteredPayments.map((payment) => ({
      id: payment.id,
      source: "payment",
      studentId: payment.studentId,
      studentName: users.get(payment.studentId)?.displayName ?? payment.studentId,
      teacherId: payment.teacherId,
      teacherName: users.get(payment.teacherId)?.displayName ?? payment.teacherId,
      itemLabel: courses.get(payment.courseId)?.title ?? { en: payment.courseId, ar: payment.courseId },
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: normalizePaymentStatus(payment.status),
      ...(payment.referenceNote ? { referenceNote: payment.referenceNote } : {}),
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));

    const invoiceRows: CombinedPaymentRow[] = filteredInvoices.map((invoice) => ({
      id: invoice.id,
      source: "subscriptionInvoice",
      studentId: invoice.studentId,
      studentName: users.get(invoice.studentId)?.displayName ?? invoice.studentId,
      teacherId: invoice.teacherId,
      teacherName: users.get(invoice.teacherId)?.displayName ?? invoice.teacherId,
      itemLabel: invoiceLabels.get(invoice.id) ?? { en: "—", ar: "—" },
      amount: invoice.amount,
      currency: invoice.currency,
      method: invoice.method,
      status: normalizePaymentStatus(invoice.status as PaymentStatus),
      ...(invoice.referenceNote ? { referenceNote: invoice.referenceNote } : {}),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }));

    return [...paymentRows, ...invoiceRows].sort((a, b) => b.createdAt - a.createdAt);
  },
};
