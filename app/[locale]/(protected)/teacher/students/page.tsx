import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { StudentManager } from "@/components/teacher/student-manager";

/**
 * TASK-1000: Teacher creates a student account (`POST /api/teacher/students`,
 * TASK-604). The route placeholder landed by TASK-701 is replaced here.
 *
 * There is no student list/detail view yet — that's TASK-1001 (teacher-scoped
 * student query) and TASK-1002 (list & detail UI), both Not Started, so this
 * page is create-only for now. See docs/tasks/phase-10-student-management.md.
 */
export default async function TeacherStudentsPage() {
  const t = await getTranslations();
  const session = await requireSession();
  assertRole(session, "teacher");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-foreground">{t("teacherDashboard.nav.students")}</h1>
      <StudentManager />
    </div>
  );
}
