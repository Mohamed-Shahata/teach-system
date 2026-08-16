import { requireSession } from "@/lib/auth/session";
import { studentManagementService } from "@/lib/server/services/studentManagementService";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { StudentManager } from "@/components/admin/student-manager";

/**
 * TASK-1904 — Admin-facing Student management (list, view, deactivate,
 * create, and manage teacher subscriptions). Education stages and
 * subjects are loaded here so the create-student form and the
 * subscriptions dialog can offer them without an extra client round trip.
 */
export default async function AdminStudentsPage() {
  const session = await requireSession();
  const [students, stages, subjects] = await Promise.all([
    studentManagementService.listStudents(session),
    centerConfigService.listEducationStages(session),
    centerConfigService.listSubjects(session),
  ]);

  return <StudentManager initialStudents={students} stages={stages} subjects={subjects} />;
}
