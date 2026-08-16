import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { assertWritableByTeacher, scopeToTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";

export interface LocalizedText {
  en?: string;
  ar?: string;
}

export interface ScheduleSlotDoc {
  id: string;
  teacherId: string;
  subjectId: string;
  stageId: string;
  courseId?: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  label?: LocalizedText;
  /** Google Meet / Zoom link the teacher set for this recurring slot's live session (Phase 6). */
  meetingUrl?: string;
  /**
   * TASK-2002 dedupe markers — prevents the per-minute cron from
   * re-sending the "class starting" notification twice for the same
   * weekly occurrence. `lastNotifiedDate` is a `YYYY-MM-DD` string (the
   * calendar date, in the deployment's server timezone, of the
   * occurrence last notified); compared against "today" rather than a
   * raw timestamp so a slot that recurs every week only needs to store
   * one date, not a growing history.
   */
  lastNotifiedDate?: string;
  /** TASK-2003 dedupe marker for the teacher's own pre-class reminder — same shape/purpose as lastNotifiedDate, tracked separately since the two notifications fire at different offsets from startTime. */
  lastReminderDate?: string;
  createdAt: number;
  updatedAt: number;
}

export type CreateScheduleSlotDoc = Omit<ScheduleSlotDoc, "id">;
export type UpdateScheduleSlotDoc = Partial<
  Pick<
    ScheduleSlotDoc,
    "subjectId" | "stageId" | "courseId" | "dayOfWeek" | "startTime" | "durationMinutes" | "label" | "meetingUrl"
  >
> & { updatedAt: number };

const COLLECTION = "schedule";

function toScheduleSlotDoc(id: string, data: FirebaseFirestore.DocumentData): ScheduleSlotDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    subjectId: String(data.subjectId),
    stageId: String(data.stageId),
    ...(data.courseId ? { courseId: String(data.courseId) } : {}),
    dayOfWeek: Number(data.dayOfWeek),
    startTime: String(data.startTime),
    durationMinutes: Number(data.durationMinutes),
    ...(data.label ? { label: data.label as LocalizedText } : {}),
    ...(data.meetingUrl ? { meetingUrl: String(data.meetingUrl) } : {}),
    ...(data.lastNotifiedDate ? { lastNotifiedDate: String(data.lastNotifiedDate) } : {}),
    ...(data.lastReminderDate ? { lastReminderDate: String(data.lastReminderDate) } : {}),
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const scheduleRepository = {
  async list(session: Session): Promise<ScheduleSlotDoc[]> {
    const snap = await scopeToTeacher(adminDb.collection(COLLECTION), session).get();
    return snap.docs
      .map((doc) => toScheduleSlotDoc(doc.id, doc.data()))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  },

  async findById(id: string): Promise<ScheduleSlotDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toScheduleSlotDoc(snap.id, snap.data() ?? {}) : null;
  },

  async create(slot: CreateScheduleSlotDoc): Promise<ScheduleSlotDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(slot);
    return { id: ref.id, ...slot };
  },

  async update(session: Session, id: string, patch: UpdateScheduleSlotDoc): Promise<ScheduleSlotDoc> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError();
    }
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },

  async delete(session: Session, id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError();
    }
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).delete();
  },

  /**
   * TASK-2001/2002/2003 — system-level read, deliberately unscoped by
   * teacher. Only the cron job (`lib/server/jobs/classNotificationsJob.ts`)
   * calls this: it has no `Session` (it isn't triggered by a signed-in
   * user) and needs to check every teacher's slots each run, not one
   * teacher's. Never call this from a request-handling path — use `list`
   * (session-scoped) there instead. Returns every slot regardless of
   * whether `meetingUrl` is set — TASK-2003's teacher reminder fires
   * specifically to nudge a teacher who *hasn't* set one yet, so the job
   * filters by `meetingUrl` itself rather than the query doing it.
   */
  async listAll(): Promise<ScheduleSlotDoc[]> {
    const snap = await adminDb.collection(COLLECTION).get();
    return snap.docs.map((doc) => toScheduleSlotDoc(doc.id, doc.data()));
  },

  /** TASK-2002 — records that this slot's "class starting" push has fired for today's occurrence, so the next cron tick within the same day doesn't resend it. */
  async markNotifiedToday(id: string, dateKey: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({ lastNotifiedDate: dateKey });
  },

  /** TASK-2003 — same dedupe purpose as markNotifiedToday, for the teacher's own pre-class reminder. */
  async markReminderSentToday(id: string, dateKey: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(id).update({ lastReminderDate: dateKey });
  },
};
