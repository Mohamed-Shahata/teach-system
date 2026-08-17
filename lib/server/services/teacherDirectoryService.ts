import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { subscriptionRepository } from "@/lib/server/repositories/subscriptionRepository";
import { enrollmentRepository, type EnrollmentDoc } from "@/lib/server/repositories/enrollmentRepository";
import { teacherProfileRepository, type TeacherProfileDoc, type LocalizedText as ProfileLocalizedText } from "@/lib/server/repositories/teacherProfileRepository";
import { subjectRepository, type SubjectDoc, type LocalizedText } from "@/lib/server/repositories/subjectRepository";
import { publicRepository, type PublicCourse } from "@/lib/server/repositories/publicRepository";

/**
 * Teacher directory service — TASK-2301, restructured by TASK-3203.
 *
 * TASK-3203 splits what used to be a single enrollment-derived "my
 * teachers" list into two views on the same page: `listTeacherDirectory`
 * returns *every* publicly-visible teacher in the system (Phase 23's
 * original intent — "every teacher in the system", not just ones the
 * student already has a relationship with), each flagged `subscribed`
 * using the student's `subscriptions` docs (Phase 29) rather than
 * `enrollments` — a subscription (not a one-off course enrollment) is
 * what "this student studies with this teacher" means per
 * `subscriptionRepository`'s own doc comment, and it's what this task's
 * description explicitly names as the "My Teachers" filter's source.
 * `getTeacherAccountView` (renamed from `getTeacherCoursesForStudent`)
 * drops the old enrollment-gate entirely — any authenticated student can
 * open any public teacher's account view, per this task's acceptance
 * criteria ("clicking any teacher... opens that teacher's account/profile
 * view"), and now also surfaces the TASK-3101 profile-detail fields
 * (bio/headline/yearsOfExperience/specialization/socialLinks) alongside
 * the course list. Fine-grained per-lesson access gating for non-
 * enrolled/non-subscribed students is TASK-3204's scope, not this one —
 * this task only exposes course *metadata*, unchanged from TASK-2303.
 */

export interface TeacherDirectoryEntry {
  teacherId: string;
  displayName: string;
  avatarUrl?: string;
  /** Kept as the raw `LocalizedText` (not pre-localized) — same as `courseService`'s `title`/`description` — so the page picks `en`/`ar` per request locale. */
  subjectName?: LocalizedText;
  slug?: string;
  courseCount: number;
  /** TASK-3203 — whether the signed-in student has an `active` subscription with this teacher (Phase 29). Drives the "My Teachers" tab filter. */
  subscribed: boolean;
}

function toEntry(
  profile: TeacherProfileDoc,
  subjects: Map<string, SubjectDoc>,
  subscribedTeacherIds: Set<string>,
): TeacherDirectoryEntry {
  // TASK-2402: a teacher may now have more than one subject; the directory
  // entry still shows a single `subjectName` (list-card real estate), so
  // this picks the first of the teacher's `subjectIds`.
  const firstSubjectId = profile.subjectIds?.[0];
  const subject = firstSubjectId ? subjects.get(firstSubjectId) : undefined;
  return {
    teacherId: profile.teacherId,
    displayName: profile.displayName,
    ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    ...(subject ? { subjectName: subject.name } : {}),
    ...(profile.slug ? { slug: profile.slug } : {}),
    courseCount: profile.stats?.totalPublishedCourses ?? 0,
    subscribed: subscribedTeacherIds.has(profile.teacherId),
  };
}

function activeSubscribedTeacherIds(subscriptions: { teacherId: string; status: string }[]): Set<string> {
  return new Set(subscriptions.filter((sub) => sub.status === "active").map((sub) => sub.teacherId));
}

export interface TeacherCoursesEntry {
  courseId: string;
  slug: string;
  title: LocalizedText;
  description?: Partial<LocalizedText>;
  thumbnailUrl?: string;
  /** Whether the signed-in student already has a non-cancelled enrollment in this course. */
  enrolled: boolean;
}

export interface TeacherAccountView {
  teacherId: string;
  displayName: string;
  avatarUrl?: string;
  subjectName?: LocalizedText;
  /** TASK-3101 profile-detail fields, shown on the account view alongside the course list. Uses `teacherProfileRepository`'s `LocalizedText` (both fields optional) — distinct from `subjectName`'s, which comes from `subjectRepository` and requires both `en`/`ar`. */
  bio?: ProfileLocalizedText;
  headline?: ProfileLocalizedText;
  yearsOfExperience?: number;
  specialization?: string;
  socialLinks?: TeacherProfileDoc["socialLinks"];
  subscribed: boolean;
  courses: TeacherCoursesEntry[];
}

function toCoursesEntry(course: PublicCourse, enrolledCourseIds: Set<string>): TeacherCoursesEntry {
  return {
    courseId: course.id,
    slug: course.slug,
    title: course.title,
    ...(course.description ? { description: course.description } : {}),
    ...(course.thumbnailUrl ? { thumbnailUrl: course.thumbnailUrl } : {}),
    enrolled: enrolledCourseIds.has(course.id),
  };
}

export const teacherDirectoryService = {
  /**
   * TASK-3203 — every publicly-visible teacher (`isPublic == true`),
   * each flagged `subscribed` for the signed-in student, sorted by
   * display name. Replaces TASK-2301's enrollment-scoped `listMyTeachers`
   * as the page's default (full-directory) view; the "My Teachers" tab
   * filters this same list client-side by `subscribed`.
   */
  async listTeacherDirectory(session: Session): Promise<TeacherDirectoryEntry[]> {
    assertRole(session, "student");
    const [profiles, subjects, subscriptions] = await Promise.all([
      teacherProfileRepository.listPublic(),
      subjectRepository.list(),
      subscriptionRepository.listByStudent(session.uid),
    ]);
    const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
    const subscribedTeacherIds = activeSubscribedTeacherIds(subscriptions);

    return profiles
      .map((profile) => toEntry(profile, subjectsById, subscribedTeacherIds))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  /**
   * TASK-3203 — a single teacher's account view: TASK-3101 profile
   * fields plus their published courses, each flagged with whether the
   * signed-in student is already enrolled. Open to any authenticated
   * student (no prior enrollment/subscription required) — only a
   * non-public profile (or a nonexistent one) is treated as not found.
   * Course *content* gating for non-enrolled students is TASK-3204.
   */
  async getTeacherAccountView(session: Session, teacherId: string): Promise<TeacherAccountView> {
    assertRole(session, "student");
    const [profile, courses, subjects, enrollments, subscriptions] = await Promise.all([
      teacherProfileRepository.findByTeacherId(teacherId),
      publicRepository.listPublishedCoursesByTeacher(teacherId),
      subjectRepository.list(),
      enrollmentRepository.listByStudent(session.uid),
      subscriptionRepository.listByStudent(session.uid),
    ]);
    if (!profile || !profile.isPublic) throw new NotFoundError();

    const firstSubjectId = profile.subjectIds?.[0];
    const subject = firstSubjectId ? subjects.find((s) => s.id === firstSubjectId) : undefined;
    const enrolledCourseIds = new Set(
      enrollments
        .filter((e: EnrollmentDoc) => e.teacherId === teacherId && e.status !== "cancelled")
        .map((e: EnrollmentDoc) => e.courseId),
    );

    return {
      teacherId,
      displayName: profile.displayName,
      ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
      ...(subject ? { subjectName: subject.name } : {}),
      ...(profile.bio ? { bio: profile.bio } : {}),
      ...(profile.headline ? { headline: profile.headline } : {}),
      ...(profile.yearsOfExperience !== undefined ? { yearsOfExperience: profile.yearsOfExperience } : {}),
      ...(profile.specialization ? { specialization: profile.specialization } : {}),
      ...(profile.socialLinks ? { socialLinks: profile.socialLinks } : {}),
      subscribed: activeSubscribedTeacherIds(subscriptions).has(teacherId),
      courses: courses.map((course) => toCoursesEntry(course, enrolledCourseIds)),
    };
  },
};
