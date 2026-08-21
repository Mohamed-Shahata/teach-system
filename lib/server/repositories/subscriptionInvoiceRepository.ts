import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { assertWritableByTeacher, scopeToTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { InvoicePaymentMethod, InvoiceStatus } from "@/lib/validation/subscriptionInvoice.schema";

/**
 * Repository for `subscriptionInvoices/{id}` — one month's bill for one
 * `subscriptions/{subscriptionId}` (Phase 3). Mirrors `paymentRepository`'s
 * `pending → confirmed / rejected` manual-review shape so the Admin/teacher
 * payments UI can reuse the same patterns, but stays a separate collection
 * since a subscription invoice isn't tied to a `course`.
 *
 * One invoice per `(subscriptionId, period)` — enforced at the service
 * layer via `findBySubscriptionAndPeriod` before creating a new one.
 */
export interface SubscriptionInvoiceDoc {
  id: string;
  subscriptionId: string;
  studentId: string;
  teacherId: string;
  offeringId: string;
  /** Billing period, `YYYY-MM`. */
  period: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  method?: InvoicePaymentMethod;
  referenceNote?: string;
  confirmedBy?: { uid: string; role: "admin" | "teacher" };
  createdAt: number;
  updatedAt: number;
}

export type CreateSubscriptionInvoiceDoc = Omit<SubscriptionInvoiceDoc, "id">;
export type UpdateSubscriptionInvoiceDoc = Partial<
  Pick<SubscriptionInvoiceDoc, "status" | "method" | "referenceNote" | "confirmedBy">
> & { updatedAt: number };

const COLLECTION = "subscriptionInvoices";

function toDoc(id: string, data: FirebaseFirestore.DocumentData): SubscriptionInvoiceDoc {
  return {
    id,
    subscriptionId: String(data.subscriptionId),
    studentId: String(data.studentId),
    teacherId: String(data.teacherId),
    offeringId: String(data.offeringId),
    period: String(data.period),
    amount: Number(data.amount),
    currency: String(data.currency),
    status: data.status as InvoiceStatus,
    ...(data.method ? { method: data.method as InvoicePaymentMethod } : {}),
    ...(data.referenceNote ? { referenceNote: String(data.referenceNote) } : {}),
    ...(data.confirmedBy ? { confirmedBy: data.confirmedBy as SubscriptionInvoiceDoc["confirmedBy"] } : {}),
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const subscriptionInvoiceRepository = {
  async findById(id: string): Promise<SubscriptionInvoiceDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toDoc(snap.id, snap.data() ?? {}) : null;
  },

  async findBySubscriptionAndPeriod(subscriptionId: string, period: string): Promise<SubscriptionInvoiceDoc | null> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("subscriptionId", "==", subscriptionId)
      .where("period", "==", period)
      .limit(1)
      .get();
    const first = snap.docs[0];
    return first ? toDoc(first.id, first.data()) : null;
  },

  async listBySubscription(subscriptionId: string): Promise<SubscriptionInvoiceDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("subscriptionId", "==", subscriptionId).get();
    return snap.docs.map((doc) => toDoc(doc.id, doc.data())).sort((a, b) => b.createdAt - a.createdAt);
  },

  /** A student's own invoice history across all their subscriptions. */
  async listByStudent(studentId: string): Promise<SubscriptionInvoiceDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("studentId", "==", studentId).get();
    return snap.docs.map((doc) => toDoc(doc.id, doc.data())).sort((a, b) => b.createdAt - a.createdAt);
  },

  /** A teacher's (or unscoped Admin's) invoice queue — e.g. `status: "pending"` for manual review. */
  async listByTeacher(session: Session, status?: InvoiceStatus): Promise<SubscriptionInvoiceDoc[]> {
    let query = scopeToTeacher(adminDb.collection(COLLECTION), session);
    if (status) query = query.where("status", "==", status);
    const snap = await query.get();
    return snap.docs.map((doc) => toDoc(doc.id, doc.data())).sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Deduplicated `subscriptionId`s with a `confirmed` invoice for a given
   * `period` — TASK-3404's "due for renewal" list negates this against
   * every active subscription to find who hasn't paid for the current
   * month yet.
   */
  async listConfirmedSubscriptionIdsForPeriod(period: string): Promise<Set<string>> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("period", "==", period)
      .where("status", "==", "confirmed")
      .get();
    return new Set(snap.docs.map((doc) => String(doc.data().subscriptionId)));
  },

  async create(invoice: CreateSubscriptionInvoiceDoc): Promise<SubscriptionInvoiceDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(invoice);
    return { id: ref.id, ...invoice };
  },

  async update(session: Session, id: string, patch: UpdateSubscriptionInvoiceDoc): Promise<SubscriptionInvoiceDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },
};
