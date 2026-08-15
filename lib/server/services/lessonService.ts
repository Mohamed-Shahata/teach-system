import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { lessonRepository } from "@/lib/server/repositories/lessonRepository";
import { courseRepository } from "@/lib/server/repositories/courseRepository";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { courseService } from "@/lib/server/services/courseService";
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

  async createLesson(session: Session, courseId: string, input: CreateLessonInput) {
    const course = await courseService.getCourse(session, courseId);
    const now = Date.now();
    const lesson = await lessonRepository.create({
      teacherId: course.teacherId,
      courseId,
      title: input.title,
      order: course.lessonOrder.length,
      fileIds: input.fileIds ?? [],
      ...withoutUndefined({ description: input.description, video: input.video }),
      createdAt: now,
      updatedAt: now,
    });
    await courseRepository.update(session, courseId, {
      lessonOrder: [...course.lessonOrder, lesson.id],
      updatedAt: now,
    });
    await teacherProfileRepository.incrementStats(course.teacherId, { totalLessons: 1 });
    return lesson;
  },

  async updateLesson(session: Session, id: string, input: UpdateLessonInput) {
    assertRole(session, "teacher");
    const existing = await lessonRepository.findById(id);
    if (!existing) {
      throw new NotFoundError();
    }
    await courseService.getCourse(session, existing.courseId);
    return lessonRepository.update(session, id, {
      ...withoutUndefined(input),
      updatedAt: Date.now(),
    });
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
