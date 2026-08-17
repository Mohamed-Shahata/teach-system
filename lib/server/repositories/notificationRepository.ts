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
  /** Required for `meeting_link`/`class_reminder`; unused for `audit`. */
  teacherId?: string;
  type: "meeting_link" | "class_reminder" | "audit";
  /** `meeting_link`/`class_reminder` only. */
  scheduleId?: string;
  /** `meeting_link`/`class_reminder` only. */
  subjectId?: string;
  /** `meeting_link`/`class_reminder` only. */
  stageId?: string;
  meetingUrl?: string;
  /**
   * TASK-3002 — relative in-app path (no locale prefix, the UI prepends
   * `useLocale()`) to navigate to on click. Populated per `type` at
   * creation time by `notificationService`/`classNotificationsJob`.
   * Absent on notifications written before this task shipped.
   */
  link?: string;
  /**
   * TASK-3003 — `audit`-only fields. A generic create/update/delete trail
   * entry, distinct from the `meeting_link`/`class_reminder` shapes above
   * (which keep their own dedicated fields rather than being folded into
   * this generic one, since their consumers — push copy, click targets —
   * already depend on the specific shape).
   */
  action?: "created" | "updated" | "deleted";
  entityType?: string;
  entityId?: string;
  /** Localized `{ en, ar }` strings rendered directly by the audit panel — server-generated, not a `next-intl` key (the entity/action combination is too open-ended to enumerate as translation keys). */
  title?: { en: string; ar: string };
  /**
   * TASK-3005 — `class_reminder`-only. A teacher can mark a reminder
   * "noted" so it stops showing as active even before the class starts.
   * Independent of `read` (opening/navigating already marks `read`, but
   * a teacher may open it, see it, and still want it to keep nudging
   * them until they explicitly acknowledge).
   */
  acknowledged?: boolean;
  read: boolean;
  createdAt: number;
}

export type CreateNotificationDoc = Omit<NotificationDoc, "id">;

const COLLECTION = "notifications";

/** TASK-2003 default, TASK-3005 reuse — minutes before `startTime` a `class_reminder` fires; also defines expiry (see `listByTeacherRecipient`). Lives here (not `classNotificationsJob.ts`, which imports it) since the repository is the one enforcing the expiry window. */
export const REMINDER_MINUTES_BEFORE = 10;
const REMINDER_EXPIRY_MS = REMINDER_MINUTES_BEFORE * 60 * 1000;

function toNotificationDoc(id: string, data: FirebaseFirestore.DocumentData): NotificationDoc {
  const type: NotificationDoc["type"] =
    data.type === "class_reminder" ? "class_reminder" : data.type === "audit" ? "audit" : "meeting_link";
  return {
    id,
    // `studentId` is the pre-Phase-20 field name, still present on every
    // existing document — read it as a fallback so old `meeting_link`
    // docs written before `recipientId` existed keep working unchanged.
    recipientId: String(data.recipientId ?? data.studentId),
    type,
    ...(data.teacherId ? { teacherId: String(data.teacherId) } : {}),
    ...(data.scheduleId ? { scheduleId: String(data.scheduleId) } : {}),
    ...(data.subjectId ? { subjectId: String(data.subjectId) } : {}),
    ...(data.stageId ? { stageId: String(data.stageId) } : {}),
    ...(data.meetingUrl ? { meetingUrl: String(data.meetingUrl) } : {}),
    ...(data.link ? { link: String(data.link) } : {}),
    ...(data.action ? { action: data.action } : {}),
    ...(data.entityType ? { entityType: String(data.entityType) } : {}),
    ...(data.entityId ? { entityId: String(data.entityId) } : {}),
    ...(data.title ? { title: data.title } : {}),
    ...(data.acknowledged ? { acknowledged: true } : {}),
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

  /**
   * TASK-2003 — the signed-in teacher's own `class_reminder` notifications,
   * most recent first. TASK-3005 — excludes reminders the teacher has
   * already acknowledged, and reminders whose class start time (always
   * exactly `createdAt + REMINDER_MINUTES_BEFORE` minutes — see
   * `classNotificationsJob.ts`) has passed, so an ignored reminder
   * doesn't linger as "active" forever. Filtered at read time rather
   * than by a separate sweep job/deletion — no data is lost, an expired
   * reminder simply stops being returned here.
   */
  async listByTeacherRecipient(teacherId: string): Promise<NotificationDoc[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("recipientId", "==", teacherId)
      .where("type", "==", "class_reminder")
      .get();
    const now = Date.now();
    return snap.docs
      .map((doc) => toNotificationDoc(doc.id, doc.data()))
      .filter((n) => !n.acknowledged && n.createdAt + REMINDER_EXPIRY_MS > now)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  /** TASK-3003 — the signed-in user's own generic audit trail, any role, most recent first. */
  async listByRecipientAudit(recipientId: string): Promise<NotificationDoc[]> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("recipientId", "==", recipientId)
      .where("type", "==", "audit")
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

  /** TASK-3005 — a teacher marks their own `class_reminder` "noted" so it stops showing as active before it naturally expires. Also flips `read`, same as opening it. */
  async acknowledge(session: Session, id: string): Promise<NotificationDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    if (existing.type !== "class_reminder") throw new ForbiddenError();
    if (session.role !== "admin" && existing.recipientId !== session.uid) throw new ForbiddenError();
    await adminDb.collection(COLLECTION).doc(id).update({ acknowledged: true, read: true });
    return { ...existing, acknowledged: true, read: true };
  },
};
