import { requireSession } from "@/lib/auth/session";
import { adminCourseOverviewService } from "@/lib/server/services/adminCourseOverviewService";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { CourseOverview } from "@/components/admin/course-overview";

/**
 * TASK-2401 — Admin-facing, read-only, center-wide course list. Subjects
 * and stages are loaded here so the filter dropdowns don't need an extra
 * client round trip, same pattern as `admin/teachers`/`admin/students`.
 */
export default async function AdminCoursesPage() {
  const session = await requireSession();
  const [courses, subjects, stages] = await Promise.all([
    adminCourseOverviewService.listCourses(session),
    centerConfigService.listSubjects(session),
    centerConfigService.listEducationStages(session),
  ]);

  return <CourseOverview initialCourses={courses} subjects={subjects} stages={stages} />;
}
