import { requireSession } from "@/lib/auth/session";
import { studentSettingsService } from "@/lib/server/services/studentSettingsService";
import { StudentSettingsForm } from "@/components/student/student-settings-form";

/**
 * TASK-1005 — Student account settings (display name, password,
 * profile picture). Mirrors `admin/settings/page.tsx` (TASK-1907).
 */
export default async function StudentSettingsPage() {
  const session = await requireSession();
  const profile = await studentSettingsService.getProfile(session);

  return <StudentSettingsForm initialProfile={profile} />;
}
