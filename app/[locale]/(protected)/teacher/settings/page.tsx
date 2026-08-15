import { getTranslations } from "next-intl/server";

/**
 * Placeholder route landed by TASK-701 (nav must link somewhere real,
 * not 404). Real teacher settings aren't scheduled in their own task yet
 * — see docs/tasks/README.md.
 */
export default async function TeacherSettingsPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">{t("teacherDashboard.nav.settings")}</h1>
      <p className="text-sm text-foreground/60">{t("common.comingSoon")}</p>
    </div>
  );
}
