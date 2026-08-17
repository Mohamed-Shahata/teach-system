import "server-only";
import { scheduleRepository } from "@/lib/server/repositories/scheduleRepository";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { notificationRepository, type CreateNotificationDoc } from "@/lib/server/repositories/notificationRepository";
import { pushDispatchService } from "@/lib/server/services/pushDispatchService";
import type { ScheduleSlotDoc } from "@/lib/server/repositories/scheduleRepository";

/** TASK-2003 default — minutes before `startTime` the teacher reminder fires. */
const REMINDER_MINUTES_BEFORE = 10;

interface JobResult {
  /** Students notified that class is starting (TASK-2002). */
  notified: number;
  /** Teachers sent a pre-class reminder (TASK-2003). */
  reminded: number;
}

/**
 * Entry point the per-minute cron trigger (TASK-2001,
 * `app/api/cron/class-notifications/route.ts`) calls into.
 *
 * Two independent jobs share one schedule read (`scheduleRepository.listAll`)
 * since both need "does any slot match right now":
 *   - TASK-2002: a slot's `startTime` is now -> auto-fire the same
 *     "class starting" push `notificationService.sendMeetingLink` sends
 *     manually, to the same recipients (active enrollment with this
 *     teacher + same `stageId`).
 *   - TASK-2003: a slot's `startTime` is `REMINDER_MINUTES_BEFORE` minutes
 *     from now -> notify the teacher themselves, regardless of whether
 *     `meetingUrl` is set yet (that's the point of the nudge).
 *
 * `now` is injectable for tests; defaults to the real clock.
 */
export async function runClassNotificationsJob(now: Date = new Date()): Promise<JobResult> {
  const slots = await scheduleRepository.listAll();
  const dayOfWeek = now.getDay();
  const dateKey = toDateKey(now);
  const currentHHMM = toHHMM(now);

  const dueForClassStart = slots.filter(
    (slot) =>
      slot.dayOfWeek === dayOfWeek &&
      slot.startTime === currentHHMM &&
      slot.meetingUrl &&
      slot.lastNotifiedDate !== dateKey,
  );

  const dueForReminder = slots.filter(
    (slot) =>
      slot.dayOfWeek === dayOfWeek &&
      slot.startTime === addMinutes(currentHHMM, REMINDER_MINUTES_BEFORE) &&
      slot.lastReminderDate !== dateKey,
  );

  const notified = await notifyStudentsClassIsStarting(dueForClassStart, dateKey);
  const reminded = await remindTeachersClassIsUpcoming(dueForReminder, dateKey);

  return { notified, reminded };
}

/** TASK-2002 */
async function notifyStudentsClassIsStarting(slots: ScheduleSlotDoc[], dateKey: string): Promise<number> {
  let notified = 0;

  for (const slot of slots) {
    const enrollments = await enrollmentRepository.listAllByTeacherId(slot.teacherId);
    const activeStudentIds = Array.from(
      new Set(enrollments.filter((enrollment) => enrollment.status === "active").map((e) => e.studentId)),
    );

    const students = await userRepository.findByIds(activeStudentIds);
    const matchingStudentIds = activeStudentIds.filter((studentId) => {
      const student = students.get(studentId);
      return student?.role === "student" && student.stageId === slot.stageId;
    });

    const createdAt = Date.now();
    const notifications: CreateNotificationDoc[] = matchingStudentIds.map((studentId) => ({
      recipientId: studentId,
      teacherId: slot.teacherId,
      type: "meeting_link",
      scheduleId: slot.id,
      subjectId: slot.subjectId,
      stageId: slot.stageId,
      meetingUrl: slot.meetingUrl as string,
      read: false,
      createdAt,
    }));

    if (notifications.length > 0) {
      const created = await notificationRepository.createMany(notifications);
      // TASK-2603 — best-effort push alongside the in-app bell.
      await pushDispatchService.dispatchForNotifications(created);
      notified += notifications.length;
    }

    // Mark the occurrence notified even with zero matching students, so a
    // teacher with no active students in this slot's stage doesn't get
    // re-scanned every minute for the rest of the day.
    await scheduleRepository.markNotifiedToday(slot.id, dateKey);
  }

  return notified;
}

/** TASK-2003 */
async function remindTeachersClassIsUpcoming(slots: ScheduleSlotDoc[], dateKey: string): Promise<number> {
  const createdAt = Date.now();
  const notifications: CreateNotificationDoc[] = slots.map((slot) => ({
    recipientId: slot.teacherId,
    teacherId: slot.teacherId,
    type: "class_reminder",
    scheduleId: slot.id,
    subjectId: slot.subjectId,
    stageId: slot.stageId,
    ...(slot.meetingUrl ? { meetingUrl: slot.meetingUrl } : {}),
    read: false,
    createdAt,
  }));

  if (notifications.length > 0) {
    const created = await notificationRepository.createMany(notifications);
    // TASK-2603 — best-effort push alongside the in-app bell.
    await pushDispatchService.dispatchForNotifications(created);
  }

  for (const slot of slots) {
    await scheduleRepository.markReminderSentToday(slot.id, dateKey);
  }

  return notifications.length;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Adds `minutes` to an `"HH:mm"` string, wrapping within a single day. */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
