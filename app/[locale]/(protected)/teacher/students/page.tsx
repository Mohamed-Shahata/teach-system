import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { studentService } from "@/lib/server/services/studentService";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { StudentList } from "@/components/teacher/student-list";
import { StudentManager } from "@/components/teacher/student-manager";

/**
 * TASK-1000: Teacher creates a student account (`POST /api/teacher/students`,
 * TASK-604). TASK-1002 adds the list above it — one row per student derived
 * from the teacher's enrollments (`studentService.listStudents`), each
 * linking to `/teacher/students/[studentId]` for the detail view. `stages`
 * (TASK-1905 lookup collection) feeds the create form's grade-level select.
 */
export default async function TeacherStudentsPage() {
  const t = await getTranslations();
  const session = await requireSession();
  assertRole(session, "teacher");

  const [students, stages] = await Promise.all([
    studentService.listStudents(session),
    centerConfigService.listEducationStages(session),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("teacherDashboard.nav.students")}</h1>
      <StudentList students={students} />
      <StudentManager stages={stages} />
    </div>
  );
}
