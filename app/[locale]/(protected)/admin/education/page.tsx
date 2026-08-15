import { requireSession } from "@/lib/auth/session";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { CenterConfigManager } from "@/components/admin/center-config-manager";

/**
 * TASK-1905 — Education stages & subjects management UI.
 */
export default async function AdminEducationPage() {
  const session = await requireSession();
  const [stages, subjects] = await Promise.all([
    centerConfigService.listEducationStages(session),
    centerConfigService.listSubjects(session),
  ]);

  return <CenterConfigManager initialStages={stages} initialSubjects={subjects} />;
}
