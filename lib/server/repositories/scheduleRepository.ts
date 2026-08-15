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
  createdAt: number;
  updatedAt: number;
}

export type CreateScheduleSlotDoc = Omit<ScheduleSlotDoc, "id">;
export type UpdateScheduleSlotDoc = Partial<
  Pick<ScheduleSlotDoc, "subjectId" | "stageId" | "courseId" | "dayOfWeek" | "startTime" | "durationMinutes" | "label">
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
};
