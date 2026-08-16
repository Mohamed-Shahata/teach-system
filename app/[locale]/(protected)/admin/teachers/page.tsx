import { requireSession } from "@/lib/auth/session";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { TeacherManager } from "@/components/admin/teacher-manager";

/**
 * TASK-1903 — Admin-facing Teacher management (list, view, deactivate,
 * create, and price subject/stage offerings). Subjects and stages are
 * loaded here so the create-teacher form and the per-teacher offerings
 * dialog can offer them without an extra client-side round trip.
 */
export default async function AdminTeachersPage() {
  const session = await requireSession();
  const [teachers, subjects, stages] = await Promise.all([
    teacherManagementService.listTeachers(session),
    centerConfigService.listSubjects(session),
    centerConfigService.listEducationStages(session),
  ]);

  return <TeacherManager initialTeachers={teachers} subjects={subjects} stages={stages} />;
}
