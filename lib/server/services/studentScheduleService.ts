import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { scheduleRepository, type ScheduleSlotDoc, type LocalizedText } from "@/lib/server/repositories/scheduleRepository";
import { subscriptionRepository } from "@/lib/server/repositories/subscriptionRepository";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { subjectRepository } from "@/lib/server/repositories/subjectRepository";

/**
 * TASK-3205 — student weekly schedule: every `schedule` slot belonging to
 * a teacher the student holds an `active` Phase 29 subscription with
 * (mirrors `teacherDirectoryService`'s own "subscribed" definition — a
 * subscription, not an enrollment, is what "this is the student's
 * teacher" means per `subscriptionRepository`'s doc comment). Slots are
 * joined to the teacher's display name and the subject's localized name
 * so the page doesn't need extra client-side lookups.
 */

export interface StudentScheduleSlot {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName?: LocalizedText;
  stageId: string;
  courseId?: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  label?: LocalizedText;
}

function toSlot(
  slot: ScheduleSlotDoc,
  teacherNames: Map<string, string>,
  subjectsById: Map<string, LocalizedText>,
): StudentScheduleSlot {
  return {
    id: slot.id,
    teacherId: slot.teacherId,
    teacherName: teacherNames.get(slot.teacherId) ?? "",
    subjectId: slot.subjectId,
    ...(subjectsById.has(slot.subjectId) ? { subjectName: subjectsById.get(slot.subjectId) } : {}),
    stageId: slot.stageId,
    ...(slot.courseId ? { courseId: slot.courseId } : {}),
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    durationMinutes: slot.durationMinutes,
    ...(slot.label ? { label: slot.label } : {}),
  };
}

export const studentScheduleService = {
  /**
   * Every slot for every teacher the student has an `active` subscription
   * with, sorted by day/time (`scheduleRepository.listByTeacherIds`
   * already sorts). Returns an empty list (not an error) for a student
   * with no active subscriptions.
   */
  async listMySchedule(session: Session): Promise<StudentScheduleSlot[]> {
    assertRole(session, "student");

    const subscriptions = await subscriptionRepository.listByStudent(session.uid);
    const teacherIds = Array.from(
      new Set(subscriptions.filter((sub) => sub.status === "active").map((sub) => sub.teacherId)),
    );
    if (teacherIds.length === 0) return [];

    const [slots, profiles, subjects] = await Promise.all([
      scheduleRepository.listByTeacherIds(teacherIds),
      teacherProfileRepository.findByIds(teacherIds),
      subjectRepository.list(),
    ]);

    const teacherNames = new Map(Array.from(profiles.values()).map((p) => [p.teacherId, p.displayName]));
    const subjectsById = new Map(subjects.map((s) => [s.id, s.name]));

    return slots.map((slot) => toSlot(slot, teacherNames, subjectsById));
  },
};
