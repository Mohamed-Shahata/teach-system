import "server-only";
import type { Session } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  teacherOfferingRepository,
  type TeacherOfferingDoc,
} from "@/lib/server/repositories/teacherOfferingRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";
import type { CreateTeacherOfferingInput, UpdateTeacherOfferingInput } from "@/lib/validation/teacherOffering.schema";

/**
 * Admin-only pricing of a teacher's (subject, stage) offerings — e.g.
 * "Physics, Grade 3 Secondary — 350 EGP/month". Feeds the student
 * subscription flow (`enrollmentService`/`paymentService`): a student's
 * monthly charge for a given teacher+subject+stage is looked up here,
 * never entered ad hoc at payment time.
 */
async function assertTeacherExists(teacherId: string): Promise<void> {
  const user = await userRepository.findById(teacherId);
  if (!user || user.role !== "teacher") throw new NotFoundError();
}

export const teacherOfferingService = {
  /** Admin or the owning teacher (read-only for the teacher, to see their own priced offerings). */
  async listForTeacher(session: Session, teacherId: string): Promise<TeacherOfferingDoc[]> {
    if (session.role === "teacher" && session.uid !== teacherId) throw new ForbiddenError();
    if (session.role !== "admin" && session.role !== "teacher") throw new ForbiddenError();
    return teacherOfferingRepository.listByTeacher(teacherId);
  },

  /**
   * Every teacher's offering for one grade level, with the teacher's name
   * attached — feeds the Admin's "subscribe this student to a teacher"
   * picker, which only makes sense scoped to the student's own stage.
   */
  async listByStage(session: Session, stageId: string): Promise<(TeacherOfferingDoc & { teacherName: string })[]> {
    assertRole(session, "admin");
    const offerings = await teacherOfferingRepository.listByStage(stageId);
    const teacherIds = Array.from(new Set(offerings.map((o) => o.teacherId)));
    const teachers = await userRepository.findByIds(teacherIds);
    return offerings.map((offering) => ({
      ...offering,
      teacherName: teachers.get(offering.teacherId)?.displayName ?? offering.teacherId,
    }));
  },

  async createOffering(
    session: Session,
    teacherId: string,
    input: CreateTeacherOfferingInput,
  ): Promise<TeacherOfferingDoc> {
    assertRole(session, "admin");
    await assertTeacherExists(teacherId);

    const existing = await teacherOfferingRepository.findByTeacherSubjectStage(
      teacherId,
      input.subjectId,
      input.stageId,
    );
    if (existing) throw new ConflictError();

    const now = Date.now();
    return teacherOfferingRepository.create({
      teacherId,
      subjectId: input.subjectId,
      stageId: input.stageId,
      monthlyPrice: input.monthlyPrice,
      createdAt: now,
      updatedAt: now,
    });
  },

  async updateOffering(
    session: Session,
    offeringId: string,
    input: UpdateTeacherOfferingInput,
  ): Promise<TeacherOfferingDoc> {
    assertRole(session, "admin");
    return teacherOfferingRepository.update(offeringId, {
      monthlyPrice: input.monthlyPrice,
      updatedAt: Date.now(),
    });
  },

  async deleteOffering(session: Session, offeringId: string): Promise<TeacherOfferingDoc> {
    assertRole(session, "admin");
    return teacherOfferingRepository.delete(offeringId);
  },
};
