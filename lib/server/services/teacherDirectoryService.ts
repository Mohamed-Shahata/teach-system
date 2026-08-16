import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { enrollmentRepository, type EnrollmentDoc } from "@/lib/server/repositories/enrollmentRepository";
import { teacherProfileRepository, type TeacherProfileDoc } from "@/lib/server/repositories/teacherProfileRepository";
import { subjectRepository, type SubjectDoc, type LocalizedText } from "@/lib/server/repositories/subjectRepository";
import { publicRepository, type PublicCourse } from "@/lib/server/repositories/publicRepository";

/**
 * Teacher directory service — TASK-2301. There is no student->teacher
 * relationship collection (see this phase's intro note in
 * `docs/tasks/phase-23-student-teachers-directory.md`): a student's "my
 * teachers" list is derived the same way `studentService.listStudents`
 * derives a teacher's "my students" (TASK-1002) — by grouping the
 * student's own enrollments by `teacherId`, then joining `teacherProfiles`
 * (+ `subjects`) for name/subject/slug.
 *
 * Only non-`cancelled` enrollments count a student as having "a" teacher —
 * a cancelled enrollment shouldn't keep surfacing a teacher the student no
 * longer has any live relationship with, mirroring `enrollment.schema.ts`'s
 * existing `active | completed | cancelled` status semantics.
 */

export interface TeacherDirectoryEntry {
  teacherId: string;
  displayName: string;
  avatarUrl?: string;
  /** Kept as the raw `LocalizedText` (not pre-localized) — same as `courseService`'s `title`/`description` — so the page picks `en`/`ar` per request locale. */
  subjectName?: LocalizedText;
  slug?: string;
  courseCount: number;
}

function groupByTeacher(enrollments: EnrollmentDoc[]): Map<string, EnrollmentDoc[]> {
  const groups = new Map<string, EnrollmentDoc[]>();
  for (const enrollment of enrollments) {
    if (enrollment.status === "cancelled") continue;
    const group = groups.get(enrollment.teacherId);
    if (group) {
      group.push(enrollment);
    } else {
      groups.set(enrollment.teacherId, [enrollment]);
    }
  }
  return groups;
}

function toEntry(
  teacherId: string,
  courseCount: number,
  profile: TeacherProfileDoc | undefined,
  subjects: Map<string, SubjectDoc>,
): TeacherDirectoryEntry {
  // TASK-2402: a teacher may now have more than one subject; the directory
  // entry still shows a single `subjectName` (list-card real estate), so
  // this picks the first of the teacher's `subjectIds`.
  const firstSubjectId = profile?.subjectIds?.[0];
  const subject = firstSubjectId ? subjects.get(firstSubjectId) : undefined;
  return {
    teacherId,
    displayName: profile?.displayName ?? teacherId,
    ...(profile?.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    ...(subject ? { subjectName: subject.name } : {}),
    ...(profile?.slug ? { slug: profile.slug } : {}),
    courseCount,
  };
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

export interface TeacherCoursesForStudent {
  teacherId: string;
  displayName: string;
  avatarUrl?: string;
  subjectName?: LocalizedText;
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
   * The distinct set of teachers the signed-in student has a non-cancelled
   * enrollment with, each with a course count and a link (`slug`), sorted
   * by display name.
   */
  async listMyTeachers(session: Session): Promise<TeacherDirectoryEntry[]> {
    assertRole(session, "student");
    const enrollments = await enrollmentRepository.listByStudent(session.uid);
    const groups = groupByTeacher(enrollments);

    const [profiles, subjects] = await Promise.all([
      teacherProfileRepository.findByIds(Array.from(groups.keys())),
      subjectRepository.list(),
    ]);
    const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));

    return Array.from(groups.entries())
      .map(([teacherId, rows]) => toEntry(teacherId, rows.length, profiles.get(teacherId), subjectsById))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  /**
   * TASK-2303 — a single teacher's published courses, for a student who
   * already has (or had) a relationship with that teacher, flagging which
   * ones the student is already enrolled in. Reuses `publicRepository`'s
   * published-course listing (same as the anonymous `/teachers/[slug]`
   * page) rather than the teacher-facing `courseRepository`, since a
   * student — like an anonymous visitor — should only ever see published
   * courses, never drafts; the *only* thing this adds beyond the public
   * page is the per-course `enrolled` flag.
   *
   * Scoped like `studentService.getStudentDetail`: a student with no
   * non-cancelled enrollment for this teacher is treated as not found
   * (never leaks whether the teacherId exists at all).
   */
  async getTeacherCoursesForStudent(session: Session, teacherId: string): Promise<TeacherCoursesForStudent> {
    assertRole(session, "student");
    const enrollments = (await enrollmentRepository.listByStudent(session.uid)).filter(
      (enrollment) => enrollment.teacherId === teacherId && enrollment.status !== "cancelled",
    );
    if (enrollments.length === 0) throw new NotFoundError();

    const [profile, courses, subjects] = await Promise.all([
      teacherProfileRepository.findByTeacherId(teacherId),
      publicRepository.listPublishedCoursesByTeacher(teacherId),
      subjectRepository.list(),
    ]);
    if (!profile) throw new NotFoundError();

    const firstSubjectId = profile.subjectIds?.[0];
    const subject = firstSubjectId ? subjects.find((s) => s.id === firstSubjectId) : undefined;
    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

    return {
      teacherId,
      displayName: profile.displayName,
      ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
      ...(subject ? { subjectName: subject.name } : {}),
      courses: courses.map((course) => toCoursesEntry(course, enrolledCourseIds)),
    };
  },
};
