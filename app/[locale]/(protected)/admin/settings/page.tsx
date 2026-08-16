import { requireSession } from "@/lib/auth/session";
import { adminSettingsService } from "@/lib/server/services/adminSettingsService";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";

/**
 * TASK-1907 — Admin account settings (display name, password change).
 */
export default async function AdminSettingsPage() {
  const session = await requireSession();
  const profile = await adminSettingsService.getProfile(session);

  return <AdminSettingsForm initialProfile={profile} />;
}
