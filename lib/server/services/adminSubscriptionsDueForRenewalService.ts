import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { currentPeriod, listSubscriptionsDueForRenewal } from "@/lib/server/services/subscriptionRenewalQuery";

/**
 * TASK-3404 — Admin-facing "Subscriptions due for renewal" list: every
 * `active` subscription whose current billing period has no `confirmed`
 * invoice yet, i.e. the student's paid month ran out and they haven't
 * renewed. The actual query
 * (`subscriptionRenewalQuery.listSubscriptionsDueForRenewal`) is shared
 * with TASK-3405's notification sweep job.
 */

export interface DueForRenewalRow {
  subscriptionId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  period: string;
  subscriptionCreatedAt: number;
}

export const adminSubscriptionsDueForRenewalService = {
  async list(session: Session): Promise<DueForRenewalRow[]> {
    assertRole(session, "admin");

    const period = currentPeriod();
    const due = await listSubscriptionsDueForRenewal(period);

    const users = await userRepository.findByIds([
      ...due.map((sub) => sub.studentId),
      ...due.map((sub) => sub.teacherId),
    ]);

    return due
      .map((sub) => ({
        subscriptionId: sub.id,
        studentId: sub.studentId,
        studentName: users.get(sub.studentId)?.displayName ?? sub.studentId,
        teacherId: sub.teacherId,
        teacherName: users.get(sub.teacherId)?.displayName ?? sub.teacherId,
        period,
        subscriptionCreatedAt: sub.createdAt,
      }))
      .sort((a, b) => a.subscriptionCreatedAt - b.subscriptionCreatedAt);
  },
};
