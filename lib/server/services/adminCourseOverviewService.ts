import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { courseRepository, type CourseDoc, type LocalizedText } from "@/lib/server/repositories/courseRepository";
import { enrollmentRepository } from "@/lib/server/repositories/enrollmentRepository";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { subjectRepository } from "@/lib/server/repositories/subjectRepository";
import { educationStageRepository } from "@/lib/server/repositories/educationStageRepository";

/**
 * Admin course overview service — TASK-2401. Center-wide, read-only list
 * of every course across every teacher, per `architecture/ownership-
 * model.md`: an Admin session unscopes `courseRepository.list`/
 * `enrollmentRepository.listByTeacher` (`scopeToTeacher`'s existing
 * admin-bypass, `lib/server/repositories/base.ts`), so no new repository
 * query is needed here — this service is purely the join + shape for the
 * Admin screen. No create/update/delete: courses stay teacher-owned, this
 * is visibility only (`TeacherManager`/`StudentManager`'s read side,
 * without their write actions).
 */

export interface AdminCourseOverviewEntry {
  courseId: string;
  title: LocalizedText;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName?: LocalizedText;
  stageId: string;
  stageName?: LocalizedText;
  status: CourseDoc["status"];
  enrollmentCount: number;
}

function countByCourse(enrollments: { courseId: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const enrollment of enrollments) {
    counts.set(enrollment.courseId, (counts.get(enrollment.courseId) ?? 0) + 1);
  }
  return counts;
}

export const adminCourseOverviewService = {
  /**
   * Every course across every teacher, joined with teacher display name,
   * subject/stage names, and a live enrollment count. Sorted newest
   * course first, same default order as `courseRepository.list` itself.
   */
  async listCourses(session: Session): Promise<AdminCourseOverviewEntry[]> {
    assertRole(session, "admin");

    const [courses, enrollments, subjects, stages] = await Promise.all([
      courseRepository.list(session),
      enrollmentRepository.listByTeacher(session),
      subjectRepository.list(),
      educationStageRepository.list(),
    ]);

    const teacherIds = Array.from(new Set(courses.map((course) => course.teacherId)));
    const profiles = await teacherProfileRepository.findByIds(teacherIds);

    const enrollmentCounts = countByCourse(enrollments);
    const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
    const stagesById = new Map(stages.map((stage) => [stage.id, stage]));

    return courses.map((course) => ({
      courseId: course.id,
      title: course.title,
      teacherId: course.teacherId,
      teacherName: profiles.get(course.teacherId)?.displayName ?? course.teacherId,
      subjectId: course.subjectId,
      subjectName: subjectsById.get(course.subjectId)?.name,
      stageId: course.stageId,
      stageName: stagesById.get(course.stageId)?.name,
      status: course.status,
      enrollmentCount: enrollmentCounts.get(course.id) ?? 0,
    }));
  },
};
