import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import type { LocalizedText } from "@/lib/server/repositories/courseRepository";

/**
 * Public repository — TASK-1401.
 *
 * Per docs/features/public-pages.md, the `/teachers/[slug]` and
 * `/courses/[slug]` marketing pages must never see Admin-privileged or
 * student/quiz/file data. Unlike every other repository, this one takes no
 * `Session` and applies no `scopeToTeacher` — anonymous visitors are the
 * caller. Data exposure is enforced here at the query/field level (only
 * `isPublic == true` profiles, only `status == "published"` courses, and
 * only the specific fields below are ever read off the returned doc), not
 * by filtering an already-fetched full document after the fact.
 *
 * `firestore.rules` independently allows this same read (`isPublic ==
 * true` / `status == 'published'`) for any client, so this repository's
 * restrictions are defense-in-depth for the server-rendered public pages,
 * not the only enforcement layer.
 */

export interface PublicTeacherProfile {
  teacherId: string;
  slug: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}

export interface PublicCourse {
  id: string;
  teacherId: string;
  slug: string;
  title: LocalizedText;
  description?: Partial<LocalizedText>;
  thumbnailUrl?: string;
}

const TEACHER_PROFILES = "teacherProfiles";
const COURSES = "courses";

function toPublicTeacherProfile(teacherId: string, data: FirebaseFirestore.DocumentData): PublicTeacherProfile {
  return {
    teacherId,
    slug: String(data.slug),
    displayName: String(data.displayName),
    ...(data.bio ? { bio: String(data.bio) } : {}),
    ...(data.avatarUrl ? { avatarUrl: String(data.avatarUrl) } : {}),
  };
}

function toPublicCourse(id: string, data: FirebaseFirestore.DocumentData): PublicCourse {
  return {
    id,
    teacherId: String(data.teacherId),
    slug: String(data.slug),
    title: data.title as LocalizedText,
    ...(data.description ? { description: data.description as Partial<LocalizedText> } : {}),
    ...(data.thumbnailUrl ? { thumbnailUrl: String(data.thumbnailUrl) } : {}),
  };
}

export const publicRepository = {
  /** Returns the teacher's public profile fields, or null if not public/found. */
  async findTeacherProfile(teacherId: string): Promise<PublicTeacherProfile | null> {
    const snap = await adminDb.collection(TEACHER_PROFILES).doc(teacherId).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    if (data.isPublic !== true) return null;
    return toPublicTeacherProfile(snap.id, data);
  },

  /** Same restriction as `findTeacherProfile`, keyed by the public `slug` (unique across all teachers) instead of `teacherId`. */
  async findTeacherProfileBySlug(slug: string): Promise<PublicTeacherProfile | null> {
    const snap = await adminDb.collection(TEACHER_PROFILES).where("slug", "==", slug).limit(1).get();
    const first = snap.docs[0];
    if (!first) return null;
    const data = first.data();
    if (data.isPublic !== true) return null;
    return toPublicTeacherProfile(first.id, data);
  },

  /** Lists a teacher's published courses (public fields only), newest first is not guaranteed order — callers sort as needed. */
  async listPublishedCoursesByTeacher(teacherId: string): Promise<PublicCourse[]> {
    const snap = await adminDb
      .collection(COURSES)
      .where("teacherId", "==", teacherId)
      .where("status", "==", "published")
      .get();
    return snap.docs.map((doc) => toPublicCourse(doc.id, doc.data()));
  },

  /**
   * Looks up a single published course by slug alone, for the flat
   * `/courses/[slug]` route (`folder-structure.md` — no teacher segment
   * in the URL). Per `database/collections.md`, `courses.slug` is only
   * guaranteed unique **per teacher**, not globally, so a collision
   * across two different teachers' courses is possible in theory; this
   * returns whichever published match Firestore returns first. Prefer
   * `findPublishedCourseByTeacherAndSlug` wherever the teacher is
   * already known (e.g. linking from a teacher's own profile page).
   */
  async findPublishedCourseBySlug(slug: string): Promise<PublicCourse | null> {
    const snap = await adminDb
      .collection(COURSES)
      .where("slug", "==", slug)
      .where("status", "==", "published")
      .limit(1)
      .get();
    const first = snap.docs[0];
    return first ? toPublicCourse(first.id, first.data()) : null;
  },

  /** Looks up a single published course by its owning teacher + slug (course slugs are unique per teacher, not globally). */
  async findPublishedCourseByTeacherAndSlug(teacherId: string, slug: string): Promise<PublicCourse | null> {
    const snap = await adminDb
      .collection(COURSES)
      .where("teacherId", "==", teacherId)
      .where("slug", "==", slug)
      .where("status", "==", "published")
      .limit(1)
      .get();
    const first = snap.docs[0];
    return first ? toPublicCourse(first.id, first.data()) : null;
  },

  /** Lists published courses across all teachers (public fields only), for the landing page's public catalog section. Order is not guaranteed — callers sort/slice as needed. */
  async listPublishedCourses(limitCount: number): Promise<PublicCourse[]> {
    const snap = await adminDb
      .collection(COURSES)
      .where("status", "==", "published")
      .limit(limitCount)
      .get();
    return snap.docs.map((doc) => toPublicCourse(doc.id, doc.data()));
  },

  /** Lists teacher profiles with `isPublic == true` (public fields only), for the landing page's public teacher directory. */
  async listPublicTeacherProfiles(limitCount: number): Promise<PublicTeacherProfile[]> {
    const snap = await adminDb
      .collection(TEACHER_PROFILES)
      .where("isPublic", "==", true)
      .limit(limitCount)
      .get();
    return snap.docs.map((doc) => toPublicTeacherProfile(doc.id, doc.data()));
  },
};
