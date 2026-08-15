import { getTranslations } from "next-intl/server";

/**
 * Placeholder — system-wide stats overview is TASK-1902 (Not Started).
 * Landed only so the admin nav has somewhere real to point on
 * `/admin/dashboard`, same reasoning as the old `teacher/exams`
 * placeholder before Phase 12 landed.
 */
export default async function AdminDashboardPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">{t("adminDashboard.nav.overview")}</h1>
      <p className="text-sm text-foreground/60">{t("common.comingSoon")}</p>
    </div>
  );
}
