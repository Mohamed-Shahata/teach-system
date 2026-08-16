import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Session } from "@/lib/auth/session";

/**
 * `notifications/{notificationId}` — Phase 6 (TASK-1602), created only by
 * `notificationService.sendMeetingLink` (one doc per matching student) and
 * read by the owning student only. Extended in Phase 20 (TASK-2002,
 * TASK-2003) with automatic-fire variants; see `docs/database/collections.md`.
 *
 * `recipientId` is who this notification is *for* — a student for
 * `meeting_link`, the teacher themselves for `class_reminder`. Kept as one
 * field (rather than a separate `studentId`/`teacherId`-addressed doc
 * shape) so `notificationRepository`/the read query stay a single
 * `(recipientId, createdAt)` lookup regardless of recipient role.
 */
export interface NotificationDoc {
  id: string;
  recipientId: string;
  teacherId: string;
  type: "meeting_link" | "class_reminder";
  scheduleId: string;
  subjectId: string;
  stageId: string;
  meetingUrl?: string;
  read: boolean;
  createdAt: number;
}

export type CreateNotificationDoc = Omit<NotificationDoc, "id">;

const COLLECTION = "notifications";

function toNotificationDoc(id: string, data: FirebaseFirestore.DocumentData): NotificationDoc {
  return {
    id,
    // `studentId` is the pre-Phase-20 field name, still present on every
    // existing document — read it as a fallback so old `meeting_link`
    // docs written before `recipientId` existed keep working unchanged.
    recipientId: String(data.recipientId ?? data.studentId),
    teacherId: String(data.teacherId),
    type: data.type === "class_reminder" ? "class_reminder" : "meeting_link",
    scheduleId: String(data.scheduleId),
    subjectId: String(data.subjectId),
    stageId: String(data.stageId),
    ...(data.meetingUrl ? { meetingUrl: String(data.meetingUrl) } : {}),
    read: Boolean(data.read),
    createdAt: Number(data.createdAt),
  };
}

export const notificationRepository = {
  /** The signed-in student's own notifications, most recent first. */
  async listByStudent(studentId: string): Promise<NotificationDoc[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("recipientId", "==", studentId)
      .where("type", "==", "meeting_link")
      .get();
    return snap.docs
      .map((doc) => toNotificationDoc(doc.id, doc.data()))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  /** TASK-2003 — the signed-in teacher's own `class_reminder` notifications, most recent first. */
  async listByTeacherRecipient(teacherId: string): Promise<NotificationDoc[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("recipientId", "==", teacherId)
      .where("type", "==", "class_reminder")
      .get();
    return snap.docs
      .map((doc) => toNotificationDoc(doc.id, doc.data()))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async findById(id: string): Promise<NotificationDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toNotificationDoc(snap.id, snap.data() ?? {}) : null;
  },

  /**
   * One notification doc per matching student, written in a single batch —
   * mirrors `lessonRepository`'s reorder batch. Returns the created docs.
   */
  async createMany(notifications: CreateNotificationDoc[]): Promise<NotificationDoc[]> {
    if (notifications.length === 0) return [];
    const batch = adminDb.batch();
    const refs = notifications.map(() => adminDb.collection(COLLECTION).doc());
    notifications.forEach((notification, index) => {
      batch.create(refs[index], notification);
    });
    await batch.commit();
    return notifications.map((notification, index) => ({ id: refs[index].id, ...notification }));
  },

  async markRead(session: Session, id: string): Promise<NotificationDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    if (session.role !== "admin" && existing.recipientId !== session.uid) throw new ForbiddenError();
    await adminDb.collection(COLLECTION).doc(id).update({ read: true });
    return { ...existing, read: true };
  },
};
