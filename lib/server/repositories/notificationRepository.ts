import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { Session } from "@/lib/auth/session";

/**
 * `notifications/{notificationId}` — Phase 6 (TASK-1602), created only by
 * `notificationService.sendMeetingLink` (one doc per matching student) and
 * read by the owning student only. See `docs/database/collections.md`.
 */
export interface NotificationDoc {
  id: string;
  studentId: string;
  teacherId: string;
  type: "meeting_link";
  scheduleId: string;
  subjectId: string;
  stageId: string;
  meetingUrl: string;
  read: boolean;
  createdAt: number;
}

export type CreateNotificationDoc = Omit<NotificationDoc, "id">;

const COLLECTION = "notifications";

function toNotificationDoc(id: string, data: FirebaseFirestore.DocumentData): NotificationDoc {
  return {
    id,
    studentId: String(data.studentId),
    teacherId: String(data.teacherId),
    type: "meeting_link",
    scheduleId: String(data.scheduleId),
    subjectId: String(data.subjectId),
    stageId: String(data.stageId),
    meetingUrl: String(data.meetingUrl),
    read: Boolean(data.read),
    createdAt: Number(data.createdAt),
  };
}

export const notificationRepository = {
  /** The signed-in student's own notifications, most recent first. */
  async listByStudent(studentId: string): Promise<NotificationDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("studentId", "==", studentId).get();
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
    if (session.role !== "admin" && existing.studentId !== session.uid) throw new ForbiddenError();
    await adminDb.collection(COLLECTION).doc(id).update({ read: true });
    return { ...existing, read: true };
  },
};
