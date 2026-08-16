import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { courseService } from "@/lib/server/services/courseService";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { CourseManager } from "@/components/teacher/course-manager";

/**
 * TASK-803: teacher-facing course list & create/edit form.
 *
 * `subjectId`/`stageId` on the create/edit form are pulled from the
 * `subjects`/`educationStages` lookup collections (TASK-1905) rather
 * than free text, so a course can only ever reference a real subject
 * and stage. The subject list is further narrowed to the teacher's own
 * assigned subject (`teacherProfiles.subjectId`, set by an Admin) --
 * a teacher only teaches one subject unless an Admin grants more.
 */
export default async function TeacherCoursesPage() {
  const t = await getTranslations();
  const session = await requireSession();
  assertRole(session, "teacher");

  const [courses, allSubjects, stages, teacherProfile] = await Promise.all([
    courseService.listCourses(session),
    centerConfigService.listSubjects(session),
    centerConfigService.listEducationStages(session),
    teacherProfileRepository.findByTeacherId(session.uid),
  ]);
  const subjects = teacherProfile?.subjectId
    ? allSubjects.filter((subject) => subject.id === teacherProfile.subjectId)
    : allSubjects;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">{t("teacherDashboard.nav.courses")}</h1>
      <CourseManager initialCourses={courses} subjects={subjects} stages={stages} />
    </div>
  );
}
