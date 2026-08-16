import "server-only";
import { assertRole } from "@/lib/auth/guards";
import { scheduleRepository } from "@/lib/server/repositories/scheduleRepository";
import type { Session } from "@/lib/auth/session";
import type {
  CreateScheduleSlotInput,
  UpdateScheduleSlotWithIdInput,
} from "@/lib/validation/schedule.schema";

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

export const scheduleService = {
  async listSchedule(session: Session) {
    assertRole(session, "teacher");
    return scheduleRepository.list(session);
  },

  async createScheduleSlot(session: Session, input: CreateScheduleSlotInput) {
    assertRole(session, "teacher");
    const now = Date.now();
    return scheduleRepository.create({
      teacherId: session.uid,
      subjectId: input.subjectId,
      stageId: input.stageId,
      ...withoutUndefined({
        courseId: input.courseId,
        label: input.label,
        meetingUrl: input.meetingUrl,
      }),
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateScheduleSlot(session: Session, input: UpdateScheduleSlotWithIdInput) {
    assertRole(session, "teacher");
    const { id, ...patch } = input;
    return scheduleRepository.update(session, id, {
      ...withoutUndefined(patch),
      updatedAt: Date.now(),
    });
  },

  async deleteScheduleSlot(session: Session, id: string) {
    assertRole(session, "teacher");
    await scheduleRepository.delete(session, id);
  },
};
