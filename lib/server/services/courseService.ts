import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { courseRepository } from "@/lib/server/repositories/courseRepository";
import { assertWritableByTeacher } from "@/lib/server/repositories/base";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
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

  async createCourse(session: Session, input: CreateCourseInput) {
    assertRole(session, "teacher");
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
    return course;
  },

  async updateCourse(session: Session, id: string, input: UpdateCourseInput) {
    assertRole(session, "teacher");
    const existing = await courseRepository.findById(id);
    if (!existing) {
      throw new NotFoundError();
    }
    const slug = input.title ? slugify(input.title.en) : undefined;
    if (slug) {
      await assertSlugAvailable(existing.teacherId, slug, id);
    }
    return courseRepository.update(session, id, {
      ...withoutUndefined({
        ...input,
        slug,
      }),
      updatedAt: Date.now(),
    });
  },

  async publishCourse(session: Session, id: string) {
    assertRole(session, "teacher");
    const existing = await courseRepository.findById(id);
    const updated = await courseRepository.update(session, id, { status: "published", updatedAt: Date.now() });
    if (existing?.status !== "published") {
      await teacherProfileRepository.incrementStats(updated.teacherId, { totalPublishedCourses: 1 });
    }
    return updated;
  },

  async unpublishCourse(session: Session, id: string) {
    assertRole(session, "teacher");
    const existing = await courseRepository.findById(id);
    const updated = await courseRepository.update(session, id, { status: "draft", updatedAt: Date.now() });
    if (existing?.status === "published") {
      await teacherProfileRepository.incrementStats(updated.teacherId, { totalPublishedCourses: -1 });
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
  },
};
