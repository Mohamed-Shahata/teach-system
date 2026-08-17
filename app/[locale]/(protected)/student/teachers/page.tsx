import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { teacherDirectoryService } from "@/lib/server/services/teacherDirectoryService";
import { TeachersDirectory } from "@/components/student/teachers-directory";

/**
 * TASK-3203 — "Teachers" page (renamed from TASK-2302's "My teachers"; the
 * route itself was already `student/teachers`, not `student/my-teachers`,
 * so there's no old path to redirect from). Defaults to the full directory
 * (every public teacher) with a "My Teachers" tab filtering to teachers the
 * student has an active subscription with (Phase 29) — see
 * `teachers-directory.tsx` for the tab-filtering client component and
 * `teacherDirectoryService.listTeacherDirectory` for the data. Clicking
 * any teacher (either tab) opens their account view
 * (`[teacherId]/page.tsx`).
 */
export default async function StudentTeachersPage() {
  const t = await getTranslations("studentTeachers");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  const teachers = await teacherDirectoryService.listTeacherDirectory(session);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      <TeachersDirectory
        teachers={teachers}
        locale={locale}
        strings={{
          tabAll: t("tabs.all"),
          tabMine: t("tabs.mine"),
          emptyAllTitle: t("emptyTitle"),
          emptyAllDescription: t("emptyDescription"),
          emptyMineTitle: t("emptyMineTitle"),
          emptyMineDescription: t("emptyMineDescription"),
          viewCourses: t("viewCourses"),
          coursesCount: (count) => t("coursesCount", { count }),
          subscribedBadge: t("subscribedBadge"),
        }}
      />
    </div>
  );
}
