import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { subscriptionRepository } from "@/lib/server/repositories/subscriptionRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";

/**
 * TASK-3403 — Admin-facing "Students with no active teacher subscription"
 * list: every `users` doc with `role: "student"` that has zero
 * `subscriptions` in `status: "active"`, so the Admin knows who
 * registered but never got set up with a teacher and needs following up
 * with. Deliberately checks `subscriptions` only (Phase 29's
 * teacher-relationship model) — a student's course `enrollments`
 * (Phase 11) are a separate concern per `subscriptionRepository`'s own
 * doc comment, and this list is about the subscription follow-up
 * specifically.
 */

export interface UnsubscribedStudentRow {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  createdAt: number;
}

export const adminUnsubscribedStudentsService = {
  async list(session: Session): Promise<UnsubscribedStudentRow[]> {
    assertRole(session, "admin");

    const [students, activeStudentIds] = await Promise.all([
      userRepository.listByRole("student"),
      subscriptionRepository.listActiveStudentIds(),
    ]);

    return students
      .filter((student) => !activeStudentIds.has(student.uid))
      .map((student) => ({
        uid: student.uid,
        displayName: student.displayName,
        email: student.email,
        ...(student.phone ? { phone: student.phone } : {}),
        createdAt: student.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
};
