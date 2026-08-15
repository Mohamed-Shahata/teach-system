import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { assertWritableByTeacher, scopeToTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { PaymentMethod, PaymentStatus } from "@/lib/validation/payment.schema";

/** See `docs/database/collections.md` — `payments/{paymentId}`. */
export interface PaymentDoc {
  id: string;
  studentId: string;
  courseId: string;
  teacherId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  referenceNote?: string;
  confirmedBy?: { uid: string; role: "admin" | "teacher" };
  gatewayTransactionId?: string;
  createdAt: number;
  updatedAt: number;
}

export type CreatePaymentDoc = Omit<PaymentDoc, "id">;
export type UpdatePaymentDoc = Partial<
  Pick<PaymentDoc, "status" | "confirmedBy" | "gatewayTransactionId">
> & { updatedAt: number };

const COLLECTION = "payments";

function toPaymentDoc(id: string, data: FirebaseFirestore.DocumentData): PaymentDoc {
  return {
    id,
    studentId: String(data.studentId),
    courseId: String(data.courseId),
    teacherId: String(data.teacherId),
    amount: Number(data.amount),
    currency: String(data.currency),
    method: data.method as PaymentMethod,
    status: data.status as PaymentStatus,
    ...(data.referenceNote ? { referenceNote: String(data.referenceNote) } : {}),
    ...(data.confirmedBy ? { confirmedBy: data.confirmedBy as PaymentDoc["confirmedBy"] } : {}),
    ...(data.gatewayTransactionId ? { gatewayTransactionId: String(data.gatewayTransactionId) } : {}),
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const paymentRepository = {
  async findById(id: string): Promise<PaymentDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toPaymentDoc(snap.id, snap.data() ?? {}) : null;
  },

  /** A student's own payment history — `(studentId, status)` index. */
  async listByStudent(studentId: string, status?: PaymentStatus): Promise<PaymentDoc[]> {
    let query: FirebaseFirestore.Query = adminDb.collection(COLLECTION).where("studentId", "==", studentId);
    if (status) query = query.where("status", "==", status);
    const snap = await query.get();
    return snap.docs.map((doc) => toPaymentDoc(doc.id, doc.data())).sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * A teacher's (or, unscoped, an Admin's) payments queue, optionally
   * filtered by status — e.g. the `pending` manual-review queue (TASK-704)
   * uses `(teacherId, status)`. Scoped via `scopeToTeacher` (TASK-602), so
   * a teacher session never sees another teacher's payments.
   */
  async listByTeacher(session: Session, status?: PaymentStatus): Promise<PaymentDoc[]> {
    let query = scopeToTeacher(adminDb.collection(COLLECTION), session);
    if (status) query = query.where("status", "==", status);
    const snap = await query.get();
    return snap.docs.map((doc) => toPaymentDoc(doc.id, doc.data())).sort((a, b) => b.createdAt - a.createdAt);
  },

  async create(payment: CreatePaymentDoc): Promise<PaymentDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(payment);
    return { id: ref.id, ...payment };
  },

  /**
   * Status/review-field transitions only — a payment's `studentId`,
   * `courseId`, `teacherId`, `amount`, `currency`, and `method` never
   * change after creation (per the state-machine description in
   * `features/payments.md`), so those aren't part of `UpdatePaymentDoc`.
   */
  async update(session: Session, id: string, patch: UpdatePaymentDoc): Promise<PaymentDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },

  /**
   * System-level transition to `succeeded` — used only by the (future,
   * TASK-1105) gateway webhook handler after it has verified the
   * provider's signature. Deliberately takes no `Session`: the caller
   * isn't a teacher/admin acting on their own resource, it's the
   * server itself acting on the gateway's behalf, so
   * `assertWritableByTeacher` doesn't apply here.
   */
  async markSucceeded(id: string, gatewayTransactionId?: string): Promise<PaymentDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    const patch: UpdatePaymentDoc = {
      status: "succeeded",
      updatedAt: Date.now(),
      ...(gatewayTransactionId ? { gatewayTransactionId } : {}),
    };
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },
};
