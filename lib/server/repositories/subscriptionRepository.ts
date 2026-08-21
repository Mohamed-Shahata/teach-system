import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { NotFoundError } from "@/lib/errors";

/**
 * Repository for `subscriptions/{id}` — a student's monthly subscription
 * to one teacher for one priced `teacherOfferings` (subject + stage).
 *
 * Deliberately separate from `enrollments` (`enrollmentRepository`):
 * `enrollments` ties a student to a specific `course`/lessons and is
 * gated by a `payments` doc reaching `succeeded`/`confirmed` (see
 * `docs/database/collections.md`). A `subscription` here is the
 * higher-level "this student studies with this teacher, this subject,
 * this grade" relationship the Admin sets up directly — it's what the
 * live-session meeting-link broadcast (Phase 6) filters recipients by,
 * and what the student-facing course/schedule views should scope to.
 */
export type SubscriptionStatus = "active" | "cancelled";

export interface SubscriptionDoc {
  id: string;
  studentId: string;
  teacherId: string;
  offeringId: string;
  subjectId: string;
  stageId: string;
  status: SubscriptionStatus;
  createdAt: number;
  /**
   * TASK-3405 — the last billing `period` (`YYYY-MM`) this subscription's
   * "renewal due" notification was sent for, so the daily sweep doesn't
   * re-notify the same student every day for the same overdue month.
   */
  lastRenewalNotifiedPeriod?: string;
}

export type CreateSubscriptionDoc = Omit<SubscriptionDoc, "id">;

const COLLECTION = "subscriptions";

function toDoc(id: string, data: FirebaseFirestore.DocumentData): SubscriptionDoc {
  return {
    id,
    studentId: String(data.studentId),
    teacherId: String(data.teacherId),
    offeringId: String(data.offeringId),
    subjectId: String(data.subjectId),
    stageId: String(data.stageId),
    status: data.status as SubscriptionStatus,
    createdAt: Number(data.createdAt),
    ...(data.lastRenewalNotifiedPeriod ? { lastRenewalNotifiedPeriod: String(data.lastRenewalNotifiedPeriod) } : {}),
  };
}

export const subscriptionRepository = {
  async findById(id: string): Promise<SubscriptionDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toDoc(snap.id, snap.data() ?? {}) : null;
  },

  /** A student's subscriptions — Admin's per-student subscription dialog, and the student's own "my teachers" view. */
  async listByStudent(studentId: string): Promise<SubscriptionDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("studentId", "==", studentId).get();
    return snap.docs.map((doc) => toDoc(doc.id, doc.data()));
  },

  /**
   * Active subscribers of one teacher for one specific subject+stage —
   * this is the exact recipient filter the Phase 6 "send meeting link"
   * feature needs, so a link for one grade never reaches another.
   */
  async listActiveByTeacherSubjectStage(
    teacherId: string,
    subjectId: string,
    stageId: string,
  ): Promise<SubscriptionDoc[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("teacherId", "==", teacherId)
      .where("subjectId", "==", subjectId)
      .where("stageId", "==", stageId)
      .where("status", "==", "active")
      .get();
    return snap.docs.map((doc) => toDoc(doc.id, doc.data()));
  },

  /** Every active subscription, across all students/teachers — feeds the monthly bulk-billing run. */
  async listAllActive(): Promise<SubscriptionDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("status", "==", "active").get();
    return snap.docs.map((doc) => toDoc(doc.id, doc.data()));
  },

  /**
   * Deduplicated `studentId`s with at least one `active` subscription —
   * TASK-3403's "no active teacher subscription" list negates this
   * against every student to find who has none. A `Set` rather than a
   * list since the caller only ever needs membership checks.
   */
  async listActiveStudentIds(): Promise<Set<string>> {
    const snap = await adminDb.collection(COLLECTION).where("status", "==", "active").get();
    return new Set(snap.docs.map((doc) => String(doc.data().studentId)));
  },

  async findActiveByStudentAndOffering(studentId: string, offeringId: string): Promise<SubscriptionDoc | null> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("studentId", "==", studentId)
      .where("offeringId", "==", offeringId)
      .where("status", "==", "active")
      .limit(1)
      .get();
    const first = snap.docs[0];
    return first ? toDoc(first.id, first.data()) : null;
  },

  async create(subscription: CreateSubscriptionDoc): Promise<SubscriptionDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(subscription);
    return { id: ref.id, ...subscription };
  },

  async setStatus(id: string, status: SubscriptionStatus): Promise<SubscriptionDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    await adminDb.collection(COLLECTION).doc(id).update({ status });
    return { ...existing, status };
  },

  /** TASK-3405 — records that the renewal-due notification fired for `period`, so the daily sweep skips it next run. */
  async markRenewalNotified(id: string, period: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({ lastRenewalNotifiedPeriod: period });
  },
};
