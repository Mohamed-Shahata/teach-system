import { getTranslations } from "next-intl/server";

/**
 * Placeholder route landed by TASK-701 (nav must link somewhere real,
 * not 404). Real file management is Phase 13 — see
 * docs/tasks/phase-13-file-management.md.
 */
export default async function TeacherFilesPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">{t("teacherDashboard.nav.files")}</h1>
      <p className="text-sm text-foreground/60">{t("common.comingSoon")}</p>
    </div>
  );
}
