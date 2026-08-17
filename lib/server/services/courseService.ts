import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { courseRepository } from "@/lib/server/repositories/courseRepository";
import { assertWritableByTeacher } from "@/lib/server/repositories/base";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { systemStatsRepository } from "@/lib/server/repositories/systemStatsRepository";
import { subjectRepository } from "@/lib/server/repositories/subjectRepository";
import { educationStageRepository } from "@/lib/server/repositories/educationStageRepository";
import { subscriptionRepository } from "@/lib/server/repositories/subscriptionRepository";
import { auditNotificationService } from "@/lib/server/services/auditNotificationService";
import type { CreateCourseInput, UpdateCourseInput } from "@/lib/validation/course.schema";

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "course";
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

async function assertSlugAvailable(teacherId: string, slug: string, existingCourseId?: string) {
  const existing = await courseRepository.findByTeacherAndSlug(teacherId, slug);
  if (existing && existing.id !== existingCourseId) {
    throw new ConflictError();
  }
}

/**
 * Guards against a `subjectId`/`stageId` that doesn't reference a real
 * `subjects`/`educationStages` document (TASK-1905's lookup collections —
 * see `docs/database/collections.md`). The teacher-facing UI only ever
 * sends ids from a `Select` populated by `centerConfigService`'s own
 * lists, so this mainly protects a direct API call (or a stale client)
 * from silently creating a course with a dangling reference — same
 * "never trust client-supplied ids without a lookup" reasoning as the
 * ownership guards in `lib/auth/guards.ts`. Runs both checks concurrently
 * since they're independent reads.
 */
async function assertSubjectAndStageExist(subjectId?: string, stageId?: string) {
  const [subject, stage] = await Promise.all([
    subjectId ? subjectRepository.findById(subjectId) : Promise.resolve(undefined),
    stageId ? educationStageRepository.findById(stageId) : Promise.resolve(undefined),
  ]);
  if (subjectId && !subject) {
    throw new ValidationError("errors.validation");
  }
  if (stageId && !stage) {
    throw new ValidationError("errors.validation");
  }
}

export const courseService = {
  async listCourses(session: Session) {
    assertRole(session, "teacher");
    return courseRepository.list(session);
  },

  async getCourse(session: Session, id: string) {
    assertRole(session, "teacher");
    const course = await courseRepository.findById(id);
    if (!course) {
      throw new NotFoundError();
    }
    assertWritableByTeacher(session, course);
    return course;
  },

  /**
   * TASK-3202 — course metadata for a student-facing lesson/course
   * view (title, `lessonOrder`, etc.). Deliberately *not*
   * enrollment-gated the way `lessonService.getLessonForStudent` is:
   * a course's title/description isn't sensitive, and TASK-3204 (course
   * detail reachable from a teacher's account page, no enrollment
   * required) will need the same open read — lesson *content* is the
   * part that stays gated, at the lesson read itself.
   */
  async getCourseForStudent(session: Session, id: string) {
    assertRole(session, "student", "admin");
    const course = await courseRepository.findById(id);
    if (!course) {
      throw new NotFoundError();
    }
    return course;
  },

  /**
   * TASK-3204 — whether an *active* subscription (Phase 29) covers this
   * course's content: the higher-level "this student studies with this
   * teacher, this subject, this grade" relationship applies to every
   * course in that subject/stage, not just one — see
   * `subscriptionRepository`'s doc comment. Non-students (teacher/admin
   * routes never call this) simply get `false`.
   */
  async hasActiveSubscriptionForCourse(
    session: Session,
    course: Pick<import("@/lib/server/repositories/courseRepository").CourseDoc, "teacherId" | "subjectId" | "stageId">,
  ): Promise<boolean> {
    if (session.role !== "student") return false;
    const subscriptions = await subscriptionRepository.listByStudent(session.uid);
    return subscriptions.some(
      (sub) =>
        sub.status === "active" &&
        sub.teacherId === course.teacherId &&
        sub.subjectId === course.subjectId &&
        sub.stageId === course.stageId,
    );
  },

  async createCourse(session: Session, input: CreateCourseInput) {
    assertRole(session, "teacher");
    await assertSubjectAndStageExist(input.subjectId, input.stageId);
    const slug = slugify(input.title.en);
    await assertSlugAvailable(session.uid, slug);
    const now = Date.now();
    const course = await courseRepository.create({
      teacherId: session.uid,
      subjectId: input.subjectId,
      stageId: input.stageId,
      slug,
      title: input.title,
      ...withoutUndefined({
        description: input.description,
        thumbnailUrl: input.thumbnailUrl,
        price: input.price,
        currency: input.currency,
      }),
      status: "draft",
      lessonOrder: [],
      enrollmentType: input.enrollmentType,
      createdAt: now,
      updatedAt: now,
    });
    await teacherProfileRepository.incrementStats(session.uid, { totalCourses: 1 });
    await systemStatsRepository.incrementStats({ totalCourses: 1 });
    await auditNotificationService.notify({
      action: "created",
      entityType: "course",
      entityId: course.id,
      title: { en: `Course "${course.title.en}" created`, ar: `تم إنشاء الدورة "${course.title.ar ?? course.title.en}"` },
      recipientIds: [session.uid],
      link: `/teacher/courses/${course.id}`,
    });
    return course;
  },

  async updateCourse(session: Session, id: string, input: UpdateCourseInput) {
    assertRole(session, "teacher");
    const existing = await courseRepository.findById(id);
    if (!existing) {
      throw new NotFoundError();
    }
    await assertSubjectAndStageExist(input.subjectId, input.stageId);
    const slug = input.title ? slugify(input.title.en) : undefined;
    if (slug) {
      await assertSlugAvailable(existing.teacherId, slug, id);
    }
    const updated = await courseRepository.update(session, id, {
      ...withoutUndefined({
        ...input,
        slug,
      }),
      updatedAt: Date.now(),
    });
    await auditNotificationService.notify({
      action: "updated",
      entityType: "course",
      entityId: updated.id,
      title: { en: `Course "${updated.title.en}" updated`, ar: `تم تعديل الدورة "${updated.title.ar ?? updated.title.en}"` },
      recipientIds: [session.uid],
      link: `/teacher/courses/${updated.id}`,
    });
    return updated;
  },

  async publishCourse(session: Session, id: string) {
    assertRole(session, "teacher");
    const existing = await courseRepository.findById(id);
    const updated = await courseRepository.update(session, id, { status: "published", updatedAt: Date.now() });
    if (existing?.status !== "published") {
      await teacherProfileRepository.incrementStats(updated.teacherId, { totalPublishedCourses: 1 });
      await systemStatsRepository.incrementStats({ totalPublishedCourses: 1 });
    }
    return updated;
  },

  async unpublishCourse(session: Session, id: string) {
    assertRole(session, "teacher");
    const existing = await courseRepository.findById(id);
    const updated = await courseRepository.update(session, id, { status: "draft", updatedAt: Date.now() });
    if (existing?.status === "published") {
      await teacherProfileRepository.incrementStats(updated.teacherId, { totalPublishedCourses: -1 });
      await systemStatsRepository.incrementStats({ totalPublishedCourses: -1 });
    }
    return updated;
  },

  async deleteCourse(session: Session, id: string) {
    assertRole(session, "teacher");
    const deleted = await courseRepository.delete(session, id);
    await teacherProfileRepository.incrementStats(deleted.teacherId, {
      totalCourses: -1,
      ...(deleted.status === "published" ? { totalPublishedCourses: -1 } : {}),
    });
    await systemStatsRepository.incrementStats({
      totalCourses: -1,
      ...(deleted.status === "published" ? { totalPublishedCourses: -1 } : {}),
    });
    await auditNotificationService.notify({
      action: "deleted",
      entityType: "course",
      entityId: deleted.id,
      title: { en: `Course "${deleted.title.en}" deleted`, ar: `تم حذف الدورة "${deleted.title.ar ?? deleted.title.en}"` },
      recipientIds: [session.uid],
    });
  },
};
