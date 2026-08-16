import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { paymentRepository } from "@/lib/server/repositories/paymentRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { courseRepository, type LocalizedText } from "@/lib/server/repositories/courseRepository";
import type { PaymentStatus } from "@/lib/validation/payment.schema";

/**
 * TASK-1906 — Center-wide payments oversight for the Admin.
 *
 * Read-only, unlike the teacher's own confirm/reject queue (TASK-704) —
 * "full visibility for support/dispute handling" per
 * `features/admin-dashboard.md`, not a review action. Reuses
 * `paymentService.listForTeacher`'s underlying repository call:
 * `paymentRepository.listByTeacher(session, status)` already returns
 * every teacher's payments, unscoped, for an Admin session (see
 * `repositories/base.ts`'s `scopeToTeacher`) — so this service's only
 * real job is joining student/teacher/course names onto the raw
 * `PaymentDoc`s so the Admin doesn't have to cross-reference uids by
 * hand while triaging a dispute.
 */

export interface AdminPaymentRow {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: LocalizedText;
  teacherId: string;
  teacherName: string;
  amount: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  referenceNote?: string;
  createdAt: number;
  updatedAt: number;
}

export const adminPaymentsService = {
  async listAllPayments(session: Session, status?: PaymentStatus): Promise<AdminPaymentRow[]> {
    assertRole(session, "admin");
    const payments = await paymentRepository.listByTeacher(session, status);

    const studentIds = payments.map((p) => p.studentId);
    const teacherIds = payments.map((p) => p.teacherId);
    const courseIds = payments.map((p) => p.courseId);

    const [users, courses] = await Promise.all([
      userRepository.findByIds([...studentIds, ...teacherIds]),
      courseRepository.findByIds(courseIds),
    ]);

    return payments.map((payment) => ({
      id: payment.id,
      studentId: payment.studentId,
      studentName: users.get(payment.studentId)?.displayName ?? payment.studentId,
      courseId: payment.courseId,
      courseTitle: courses.get(payment.courseId)?.title ?? { en: payment.courseId, ar: payment.courseId },
      teacherId: payment.teacherId,
      teacherName: users.get(payment.teacherId)?.displayName ?? payment.teacherId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      ...(payment.referenceNote ? { referenceNote: payment.referenceNote } : {}),
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    }));
  },
};
