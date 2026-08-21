import "server-only";
import { assertRole, assertStudentHasCourseAccess } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { lessonRepository } from "@/lib/server/repositories/lessonRepository";
import { courseRepository } from "@/lib/server/repositories/courseRepository";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { systemStatsRepository } from "@/lib/server/repositories/systemStatsRepository";
import { courseService } from "@/lib/server/services/courseService";
import { auditNotificationService } from "@/lib/server/services/auditNotificationService";
import type { CreateLessonInput, UpdateLessonInput } from "@/lib/validation/lesson.schema";

function withoutUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

export const lessonService = {
  /**
   * `courseService.getCourse` already does the `assertRole` +
   * ownership check — reused here rather than duplicated (a lesson is
   * only ever reachable through its course).
   */
  async listLessons(session: Session, courseId: string) {
    await courseService.getCourse(session, courseId);
    return lessonRepository.listByCourse(courseId);
  },

  async getLesson(session: Session, id: string) {
    assertRole(session, "teacher");
    const lesson = await lessonRepository.findById(id);
    if (!lesson) {
      throw new NotFoundError();
    }
    await courseService.getCourse(session, lesson.courseId);
    return lesson;
  },

  /**
   * TASK-3202 — the lesson list for a student-facing view (course
   * detail sidebar, prev/next). `courseService.getCourseForStudent`
   * has already established the caller may see this course's metadata
   * (open read, not enrollment-gated — see that method's doc comment),
   * so this only needs the `assertRole` here, not another ownership
   * check; per-lesson *content* access is still gated separately by
   * `getLessonForStudent`.
   */
  async listLessonsForStudent(session: Session, courseId: string) {
    assertRole(session, "student", "admin");
    return lessonRepository.listByCourse(courseId);
  },

  /**
   * TASK-3202 — the student-facing lesson player's read. A
   * `isFreePreview` lesson is reachable by any authenticated student;
   * everything else requires either a non-cancelled enrollment in the
   * lesson's course, or (TASK-3204) an active subscription covering the
   * course's teacher+subject+stage (Phase 29 — see
   * `courseService.hasActiveSubscriptionForCourse`). Kept as its own
   * read (rather than reusing `getLesson`, which is
   * `assertRole(session, "teacher")`-only) so the two audiences never
   * share a gate that's wrong for one of them.
   */
  async getLessonForStudent(session: Session, id: string) {
    assertRole(session, "student", "admin");
    const lesson = await lessonRepository.findById(id);
    if (!lesson) {
      throw new NotFoundError();
    }
    if (!lesson.isFreePreview) {
      const course = await courseRepository.findById(lesson.courseId);
      if (!course) {
        throw new NotFoundError();
      }
      const [enrollment, subscribed] = await Promise.all([
        enrollmentRepository.findByStudentAndCourse(session.uid, lesson.courseId),
        courseService.hasActiveSubscriptionForCourse(session, course),
      ]);
      assertStudentHasCourseAccess(session, enrollment, subscribed);
    }
    return lesson;
  },

  /**
   * TASK-3204 — sanitized lesson list for a *non-gated* course-detail
   * browse (any authenticated student, enrolled/subscribed or not):
   * title/order/preview-flag only, deliberately never `video`/`fileIds`
   * — those stay behind `getLessonForStudent`'s own gate so a locked
   * lesson's content URL is never present in this response at all,
   * not just hidden client-side.
   */
  async listLessonsForCourseDetail(session: Session, courseId: string) {
    assertRole(session, "student", "admin");
    const [course, lessons] = await Promise.all([
      courseRepository.findById(courseId),
      lessonRepository.listByCourse(courseId),
    ]);
    if (!course) {
      throw new NotFoundError();
    }
    const [enrollment, subscribed] = await Promise.all([
      enrollmentRepository.findByStudentAndCourse(session.uid, courseId),
      courseService.hasActiveSubscriptionForCourse(session, course),
    ]);
    const hasAccess =
      session.role === "admin" ||
      (enrollment !== null && enrollment.status !== "cancelled") ||
      subscribed;

    return lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        isFreePreview: lesson.isFreePreview,
        locked: !lesson.isFreePreview && !hasAccess,
      }));
  },

  /**
   * TASK-3104 — the lesson list for the owning teacher's course
   * preview, in the exact same shape as `listLessonsForCourseDetail`
   * so `CourseDetailView` renders both identically.
   * `courseService.getCourseForPreview` already does the ownership
   * check (reused rather than duplicated, same pattern as
   * `listLessons`/`getCourse`); `locked` here deliberately ignores the
   * teacher's own access and simulates an unenrolled/unsubscribed
   * student's view (`locked = !isFreePreview`) — the point of a
   * preview is what a prospective student would see, not what the
   * owner can already reach.
   */
  async listLessonsForCoursePreview(session: Session, courseId: string) {
    await courseService.getCourseForPreview(session, courseId);
    const lessons = await lessonRepository.listByCourse(courseId);
    return lessons
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        isFreePreview: lesson.isFreePreview,
        locked: !lesson.isFreePreview,
      }));
  },

  async createLesson(session: Session, courseId: string, input: CreateLessonInput) {
    const course = await courseService.getCourse(session, courseId);
    const now = Date.now();
    const lesson = await lessonRepository.create({
      teacherId: course.teacherId,
      courseId,
      title: input.title,
      order: course.lessonOrder.length,
      fileIds: input.fileIds ?? [],
      isFreePreview: input.isFreePreview ?? false,
      ...withoutUndefined({ description: input.description, video: input.video }),
      createdAt: now,
      updatedAt: now,
    });
    await courseRepository.update(session, courseId, {
      lessonOrder: [...course.lessonOrder, lesson.id],
      updatedAt: now,
    });
    await teacherProfileRepository.incrementStats(course.teacherId, { totalLessons: 1 });
    await systemStatsRepository.incrementStats({ totalPublishedLessons: 1 });
    await auditNotificationService.notify({
      action: "created",
      entityType: "lesson",
      entityId: lesson.id,
      title: { en: `Lesson "${lesson.title.en}" added`, ar: `تمت إضافة الدرس "${lesson.title.ar ?? lesson.title.en}"` },
      recipientIds: [session.uid],
      link: `/teacher/courses/${courseId}`,
    });
    return lesson;
  },

  async updateLesson(session: Session, id: string, input: UpdateLessonInput) {
    assertRole(session, "teacher");
    const existing = await lessonRepository.findById(id);
    if (!existing) {
      throw new NotFoundError();
    }
    await courseService.getCourse(session, existing.courseId);
    const updated = await lessonRepository.update(session, id, {
      ...withoutUndefined(input),
      updatedAt: Date.now(),
    });
    await auditNotificationService.notify({
      action: "updated",
      entityType: "lesson",
      entityId: updated.id,
      title: { en: `Lesson "${updated.title.en}" updated`, ar: `تم تعديل الدرس "${updated.title.ar ?? updated.title.en}"` },
      recipientIds: [session.uid],
      link: `/teacher/courses/${existing.courseId}`,
    });
    return updated;
  },

  async deleteLesson(session: Session, id: string) {
    assertRole(session, "teacher");
    const existing = await lessonRepository.findById(id);
    if (!existing) {
      throw new NotFoundError();
    }
    const course = await courseService.getCourse(session, existing.courseId);
    await lessonRepository.delete(session, id);
    await courseRepository.update(session, existing.courseId, {
      lessonOrder: course.lessonOrder.filter((lessonId) => lessonId !== id),
      updatedAt: Date.now(),
    });
    await teacherProfileRepository.incrementStats(course.teacherId, { totalLessons: -1 });
    await systemStatsRepository.incrementStats({ totalPublishedLessons: -1 });
    await auditNotificationService.notify({
      action: "deleted",
      entityType: "lesson",
      entityId: existing.id,
      title: { en: `Lesson "${existing.title.en}" deleted`, ar: `تم حذف الدرس "${existing.title.ar ?? existing.title.en}"` },
      recipientIds: [session.uid],
    });
  },

  /**
   * Rewrites lesson positions from a full drag-and-drop-reordered id
   * list (TASK-903). `lessonIds` must be exactly the course's current
   * lesson set (no missing/extra/duplicate ids) — a partial or stale
   * list is rejected rather than silently reconciled, since silently
   * dropping/ignoring ids could orphan a lesson from `lessonOrder`.
   */
  async reorderLessons(session: Session, courseId: string, lessonIds: string[]) {
    const course = await courseService.getCourse(session, courseId);

    const currentIds = new Set(course.lessonOrder);
    const nextIds = new Set(lessonIds);
    const sameSet =
      currentIds.size === nextIds.size && lessonIds.length === new Set(lessonIds).size &&
      course.lessonOrder.every((id) => nextIds.has(id));
    if (!sameSet) {
      throw new ValidationError();
    }

    const now = Date.now();
    await lessonRepository.reorder(lessonIds, now);
    await courseRepository.update(session, courseId, { lessonOrder: lessonIds, updatedAt: now });
    return lessonRepository.listByCourse(courseId);
  },
};
