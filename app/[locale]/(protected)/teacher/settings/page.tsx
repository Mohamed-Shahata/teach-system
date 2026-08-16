import { requireSession } from "@/lib/auth/session";
import { teacherSettingsService } from "@/lib/server/services/teacherSettingsService";
import { TeacherSettingsForm } from "@/components/teacher/teacher-settings-form";

/**
 * TASK-705 — Teacher account settings (display name, password, profile
 * picture). Replaces the `docs/tasks/README.md`-tracked placeholder from
 * Phase 7; mirrors `student/settings/page.tsx` (TASK-1005) /
 * `admin/settings/page.tsx` (TASK-1907).
 */
export default async function TeacherSettingsPage() {
  const session = await requireSession();
  const profile = await teacherSettingsService.getProfile(session);

  return <TeacherSettingsForm initialProfile={profile} />;
}
