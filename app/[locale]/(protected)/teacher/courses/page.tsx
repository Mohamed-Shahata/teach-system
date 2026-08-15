import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { courseService } from "@/lib/server/services/courseService";
import { CourseManager } from "@/components/teacher/course-manager";

/**
 * TASK-803: teacher-facing course list & create/edit form.
 */
export default async function TeacherCoursesPage() {
  const t = await getTranslations();
  const session = await requireSession();
  assertRole(session, "teacher");

  const courses = await courseService.listCourses(session);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">{t("teacherDashboard.nav.courses")}</h1>
      <CourseManager initialCourses={courses} />
    </div>
  );
}
