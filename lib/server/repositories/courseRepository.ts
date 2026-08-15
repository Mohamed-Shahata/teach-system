import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { assertWritableByTeacher, scopeToTeacher } from "@/lib/server/repositories/base";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import type { CourseStatus, EnrollmentType } from "@/lib/validation/course.schema";

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface CourseDoc {
  id: string;
  teacherId: string;
  subjectId: string;
  stageId: string;
  slug: string;
  title: LocalizedText;
  description?: Partial<LocalizedText>;
  thumbnailUrl?: string;
  status: CourseStatus;
  lessonOrder: string[];
  enrollmentType: EnrollmentType;
  price?: number;
  currency?: string;
  createdAt: number;
  updatedAt: number;
}

export type CreateCourseDoc = Omit<CourseDoc, "id">;
export type UpdateCourseDoc = Partial<
  Pick<
    CourseDoc,
    | "subjectId"
    | "stageId"
    | "slug"
    | "title"
    | "description"
    | "thumbnailUrl"
    | "status"
    | "lessonOrder"
    | "enrollmentType"
    | "price"
    | "currency"
  >
> & { updatedAt: number };

const COLLECTION = "courses";

function toCourseDoc(id: string, data: FirebaseFirestore.DocumentData): CourseDoc {
  return {
    id,
    teacherId: String(data.teacherId),
    subjectId: String(data.subjectId),
    stageId: String(data.stageId),
    slug: String(data.slug),
    title: data.title as LocalizedText,
    ...(data.description ? { description: data.description as Partial<LocalizedText> } : {}),
    ...(data.thumbnailUrl ? { thumbnailUrl: String(data.thumbnailUrl) } : {}),
    status: data.status as CourseStatus,
    lessonOrder: Array.isArray(data.lessonOrder) ? data.lessonOrder.map(String) : [],
    enrollmentType: data.enrollmentType as EnrollmentType,
    ...(typeof data.price === "number" ? { price: data.price } : {}),
    ...(data.currency ? { currency: String(data.currency) } : {}),
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const courseRepository = {
  async list(session: Session): Promise<CourseDoc[]> {
    const snap = await scopeToTeacher(adminDb.collection(COLLECTION), session).get();
    return snap.docs
      .map((doc) => toCourseDoc(doc.id, doc.data()))
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async findById(id: string): Promise<CourseDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    return snap.exists ? toCourseDoc(snap.id, snap.data() ?? {}) : null;
  },

  /**
   * Bulk lookup for joining a set of course ids to their docs (e.g. the
   * student detail view, TASK-1002, joining `enrollments.courseId` to a
   * title). Same chunking rationale as `userRepository.findByIds`.
   */
  async findByIds(ids: string[]): Promise<Map<string, CourseDoc>> {
    const unique = Array.from(new Set(ids));
    const result = new Map<string, CourseDoc>();
    const CHUNK = 30;

    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      if (chunk.length === 0) continue;
      const snap = await adminDb.collection(COLLECTION).where("__name__", "in", chunk).get();
      for (const doc of snap.docs) {
        result.set(doc.id, toCourseDoc(doc.id, doc.data()));
      }
    }

    return result;
  },

  async findByTeacherAndSlug(teacherId: string, slug: string): Promise<CourseDoc | null> {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("teacherId", "==", teacherId)
      .where("slug", "==", slug)
      .limit(1)
      .get();
    const first = snap.docs[0];
    return first ? toCourseDoc(first.id, first.data()) : null;
  },

  async create(course: CreateCourseDoc): Promise<CourseDoc> {
    const ref = adminDb.collection(COLLECTION).doc();
    await ref.create(course);
    return { id: ref.id, ...course };
  },

  async update(session: Session, id: string, patch: UpdateCourseDoc): Promise<CourseDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).update(patch);
    return { ...existing, ...patch };
  },

  async delete(session: Session, id: string): Promise<CourseDoc> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError();
    assertWritableByTeacher(session, existing);
    await adminDb.collection(COLLECTION).doc(id).delete();
    return existing;
  },
};
