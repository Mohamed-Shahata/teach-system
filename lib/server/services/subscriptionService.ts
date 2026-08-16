import "server-only";
import type { Session } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { subscriptionRepository, type SubscriptionDoc } from "@/lib/server/repositories/subscriptionRepository";
import { teacherOfferingRepository } from "@/lib/server/repositories/teacherOfferingRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import type { CreateSubscriptionInput } from "@/lib/validation/subscription.schema";

/**
 * Admin-only: subscribe a student to a teacher for one priced
 * (subject, stage) offering — see `subscriptionRepository` for why this
 * is separate from course `enrollments`. A student may hold several
 * active subscriptions (multiple teachers, or multiple subjects with the
 * same teacher), per the Admin's "one teacher or more" requirement.
 */
export const subscriptionService = {
  async listForStudent(session: Session, studentId: string): Promise<SubscriptionDoc[]> {
    assertRole(session, "admin");
    return subscriptionRepository.listByStudent(studentId);
  },

  async createSubscription(
    session: Session,
    studentId: string,
    input: CreateSubscriptionInput,
  ): Promise<SubscriptionDoc> {
    assertRole(session, "admin");

    const student = await userRepository.findById(studentId);
    if (!student || student.role !== "student") throw new NotFoundError();

    const offering = await teacherOfferingRepository.findById(input.offeringId);
    if (!offering || offering.teacherId !== input.teacherId) throw new NotFoundError();

    // The offering is priced for one specific grade level — a student
    // outside that grade can't be subscribed to it, since the monthly
    // price and the eventual meeting-link broadcast are both scoped to
    // (teacher, subject, stage).
    if (!student.stageId || student.stageId !== offering.stageId) {
      throw new ValidationError("errors.stageMismatch");
    }

    const existing = await subscriptionRepository.findActiveByStudentAndOffering(studentId, offering.id);
    if (existing) throw new ConflictError();

    return subscriptionRepository.create({
      studentId,
      teacherId: offering.teacherId,
      offeringId: offering.id,
      subjectId: offering.subjectId,
      stageId: offering.stageId,
      status: "active",
      createdAt: Date.now(),
    });
  },

  async cancelSubscription(session: Session, subscriptionId: string): Promise<SubscriptionDoc> {
    assertRole(session, "admin");
    return subscriptionRepository.setStatus(subscriptionId, "cancelled");
  },
};
