import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { assertWritableByTeacher } from "@/lib/server/repositories/base";
import { courseRepository, type CourseDoc } from "@/lib/server/repositories/courseRepository";
import { enrollmentRepository, type EnrollmentDoc } from "@/lib/server/repositories/enrollmentRepository";
import { lessonProgressRepository } from "@/lib/server/repositories/lessonProgressRepository";
import { lessonRepository, type LocalizedText } from "@/lib/server/repositories/lessonRepository";
import { userRepository, type UserDoc } from "@/lib/server/repositories/userRepository";
import { watchPercent } from "@/lib/server/services/enrollmentService";

/**
 * Student service — TASK-1002. There is no `students` collection (see
 * `docs/features/students.md`): a "teacher's students" list is derived by
 * grouping the teacher-scoped enrollments from
 * `enrollmentService.listForTeacher` (TASK-1001) by `studentId`, then
 * joining `users` for name/email.
 *
 * Quiz results are intentionally out of scope — they depend on
 * TASK-1201/1202 (Phase 12, Not Started). The detail view below covers
 * enrolled courses + progress only, per the note left on this task in
 * `docs/tasks/phase-10-student-management.md`.
 */

export interface StudentSummary {
  uid: string;
  displayName: string;
  email: string;
  stageId?: string;
  courseCount: number;
  averageProgress: number;
}

export interface StudentCourseProgress {
  courseId: string;
  courseTitle: CourseDoc["title"] | null;
  status: EnrollmentDoc["status"];
  enrollmentDate: number;
  progress: EnrollmentDoc["progress"];
}

export interface StudentDetail {
  uid: string;
  displayName: string;
  email: string;
  stageId?: string;
  courses: StudentCourseProgress[];
}

/** One lesson's watch progress for one student, within `getCourseStudentsProgress` (TASK-2504). */
export interface CourseLessonProgress {
  lessonId: string;
  lessonTitle: LocalizedText;
  /** `100` when the student manually marked the lesson complete, regardless of watch time — same override rule as `enrollment.progress` (TASK-2503). */
  completed: boolean;
  watchPercent: number;
}

/** One enrolled student's per-lesson watch breakdown for a course (TASK-2504). */
export interface CourseStudentProgress {
  studentId: string;
  displayName: string;
  email: string;
  overallPercent: number;
  lessons: CourseLessonProgress[];
}

function toSummary(uid: string, user: UserDoc | undefined, enrollments: EnrollmentDoc[]): StudentSummary {
  const averageProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, e) => sum + e.progress.percent, 0) / enrollments.length)
    : 0;

  return {
    uid,
    displayName: user?.displayName ?? uid,
    email: user?.email ?? "",
    stageId: user?.stageId,
    courseCount: enrollments.length,
    averageProgress,
  };
}

function groupByStudent(enrollments: EnrollmentDoc[]): Map<string, EnrollmentDoc[]> {
  const groups = new Map<string, EnrollmentDoc[]>();
  for (const enrollment of enrollments) {
    const group = groups.get(enrollment.studentId);
    if (group) {
      group.push(enrollment);
    } else {
      groups.set(enrollment.studentId, [enrollment]);
    }
  }
  return groups;
}

export const studentService = {
  /**
   * A teacher's (or Admin's) students, derived from their enrollments —
   * one row per distinct `studentId`, per `docs/features/students.md`.
   *
   * `teacherId` (TASK-2403) narrows an Admin's otherwise-unscoped read
   * (`scopeToTeacher`'s admin bypass returns every teacher's enrollments)
   * down to one teacher's students, for the Admin's per-teacher
   * drill-down. Ignored for a `teacher` session — `scopeToTeacher` already
   * scopes those to `session.uid`, and a teacher has no business asking
   * for another teacher's roster.
   */
  async listStudents(session: Session, teacherId?: string): Promise<StudentSummary[]> {
    assertRole(session, "teacher", "admin");
    const enrollments = (await enrollmentRepository.listByTeacher(session)).filter(
      (enrollment) => session.role !== "admin" || !teacherId || enrollment.teacherId === teacherId,
    );
    const groups = groupByStudent(enrollments);
    const users = await userRepository.findByIds(Array.from(groups.keys()));

    return Array.from(groups.entries())
      .map(([uid, rows]) => toSummary(uid, users.get(uid), rows))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  /**
   * One student's detail view, scoped to the requesting teacher's own
   * courses — a student enrolled only in another teacher's courses is
   * treated as not found for this teacher, same as any other owner-scoped
   * lookup (never leaks whether the student exists elsewhere).
   *
   * `teacherId` (TASK-2403): same Admin-only narrowing as `listStudents`
   * — an Admin viewing a specific teacher's student only sees that
   * teacher's enrollments for them, not the student's enrollments with
   * every other teacher too.
   */
  async getStudentDetail(session: Session, studentId: string, teacherId?: string): Promise<StudentDetail> {
    assertRole(session, "teacher", "admin");
    const enrollments = (await enrollmentRepository.listByTeacher(session)).filter(
      (enrollment) =>
        enrollment.studentId === studentId &&
        (session.role !== "admin" || !teacherId || enrollment.teacherId === teacherId),
    );
    if (enrollments.length === 0) throw new NotFoundError();

    const [user, courses] = await Promise.all([
      userRepository.findById(studentId),
      courseRepository.findByIds(enrollments.map((e) => e.courseId)),
    ]);

    return {
      uid: studentId,
      displayName: user?.displayName ?? studentId,
      email: user?.email ?? "",
      stageId: user?.stageId,
      courses: enrollments
        .map((enrollment) => ({
          courseId: enrollment.courseId,
          courseTitle: courses.get(enrollment.courseId)?.title ?? null,
          status: enrollment.status,
          enrollmentDate: enrollment.enrollmentDate,
          progress: enrollment.progress,
        }))
        .sort((a, b) => b.enrollmentDate - a.enrollmentDate),
    };
  },

  /**
   * TASK-2504: per-student, per-lesson watch breakdown for one course —
   * the course's student list showing watch percentage per lesson
   * instead of only the overall `enrollment.progress.percent`, so a
   * teacher can spot who's actually watching vs. who clicked "complete".
   *
   * Teacher-only (matches `courseService.getCourse`'s own scope, which
   * the course detail page this mounts on already calls); an Admin
   * viewing this would need a `teacherId` narrowing param like
   * `listStudents`/`getStudentDetail` above, not added here since no
   * Admin-facing surface calls this yet.
   */
  async getCourseStudentsProgress(session: Session, courseId: string): Promise<CourseStudentProgress[]> {
    assertRole(session, "teacher");
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError();
    assertWritableByTeacher(session, course);

    const [lessons, enrollments] = await Promise.all([
      lessonRepository.listByCourse(courseId),
      enrollmentRepository.listByTeacher(session, courseId),
    ]);
    if (enrollments.length === 0) return [];

    const users = await userRepository.findByIds(enrollments.map((e) => e.studentId));

    // TASK-3603: one batched read across every enrolled student × lesson
    // pair, instead of the old one-`getAll`-per-student N+1.
    const lessonIds = lessons.map((lesson) => lesson.id);
    const allWatchDocs = await lessonProgressRepository.listByStudentsForLessons(
      enrollments.map((e) => e.studentId),
      lessonIds,
    );
    const watchByStudentId = new Map<string, Map<string, (typeof allWatchDocs)[number]>>();
    for (const doc of allWatchDocs) {
      const forStudent = watchByStudentId.get(doc.studentId) ?? new Map();
      forStudent.set(doc.lessonId, doc);
      watchByStudentId.set(doc.studentId, forStudent);
    }

    const results = enrollments.map((enrollment) => {
      const watchByLessonId = watchByStudentId.get(enrollment.studentId) ?? new Map();

      const lessonsProgress: CourseLessonProgress[] = lessons.map((lesson) => {
        const completed = enrollment.progress.completedLessonIds.includes(lesson.id);
        const doc = watchByLessonId.get(lesson.id);
        const percent = completed
          ? 100
          : doc
            ? watchPercent(doc.videoDurationSeconds, doc.watchedSeconds)
            : 0;
        return { lessonId: lesson.id, lessonTitle: lesson.title, completed, watchPercent: percent };
      });

      const user = users.get(enrollment.studentId);
      return {
        studentId: enrollment.studentId,
        displayName: user?.displayName ?? enrollment.studentId,
        email: user?.email ?? "",
        overallPercent: enrollment.progress.percent,
        lessons: lessonsProgress,
      };
    });

    return results.sort((a, b) => a.displayName.localeCompare(b.displayName));
  },
};
