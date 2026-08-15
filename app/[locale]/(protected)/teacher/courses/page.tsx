import { getTranslations } from "next-intl/server";

/**
 * Placeholder route landed by TASK-701 (nav must link somewhere real,
 * not 404). Real course management is Phase 8 — see
 * docs/tasks/phase-08-course-management.md.
 */
export default async function TeacherCoursesPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">{t("teacherDashboard.nav.courses")}</h1>
      <p className="text-sm text-foreground/60">{t("common.comingSoon")}</p>
    </div>
  );
}
