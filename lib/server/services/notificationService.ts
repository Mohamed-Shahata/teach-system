import "server-only";
import { assertRole, assertTeacherOwnsResource } from "@/lib/auth/guards";
import { notificationRepository } from "@/lib/server/repositories/notificationRepository";
import { scheduleRepository } from "@/lib/server/repositories/scheduleRepository";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import type { Session } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const notificationService = {
  /** The signed-in student's own notifications, most recent first. */
  async listMyNotifications(session: Session) {
    assertRole(session, "student");
    return notificationRepository.listByStudent(session.uid);
  },

  async markNotificationRead(session: Session, id: string) {
    assertRole(session, "student", "teacher", "admin");
    return notificationRepository.markRead(session, id);
  },

  /** TASK-2003 — the signed-in teacher's own pre-class reminders, most recent first. */
  async listMyClassReminders(session: Session) {
    assertRole(session, "teacher");
    return notificationRepository.listByTeacherRecipient(session.uid);
  },

  /**
   * TASK-1602 (Phase 6, item 18) — sends this schedule slot's meeting link
   * to every student who is:
   *   1. actively enrolled with this same teacher (any of their courses), and
   *   2. in *exactly* the same stage as the slot (`user.stageId ===
   *      slot.stageId`) — not just "one of the teacher's students".
   *
   * Students who share the teacher but sit in a different stage, or who
   * are enrolled but `cancelled`, are excluded.
   */
  async sendMeetingLink(session: Session, scheduleId: string) {
    assertRole(session, "teacher");

    const slot = await scheduleRepository.findById(scheduleId);
    if (!slot) throw new NotFoundError();
    assertTeacherOwnsResource(session, slot);

    if (!slot.meetingUrl) {
      throw new ValidationError();
    }

    const enrollments = await enrollmentRepository.listByTeacher(session);
    const activeStudentIds = Array.from(
      new Set(enrollments.filter((enrollment) => enrollment.status === "active").map((e) => e.studentId)),
    );

    const students = await userRepository.findByIds(activeStudentIds);
    const matchingStudentIds = activeStudentIds.filter((studentId) => {
      const student = students.get(studentId);
      return student?.role === "student" && student.stageId === slot.stageId;
    });

    const now = Date.now();
    const created = await notificationRepository.createMany(
      matchingStudentIds.map((studentId) => ({
        recipientId: studentId,
        teacherId: slot.teacherId,
        type: "meeting_link" as const,
        scheduleId: slot.id,
        subjectId: slot.subjectId,
        stageId: slot.stageId,
        meetingUrl: slot.meetingUrl as string,
        read: false,
        createdAt: now,
      })),
    );

    return { sentCount: created.length };
  },
};
