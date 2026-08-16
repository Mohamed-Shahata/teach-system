import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { teacherDirectoryService } from "@/lib/server/services/teacherDirectoryService";
import type { LocalizedText } from "@/lib/server/repositories/subjectRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

/**
 * TASK-2302 — "My teachers" page. Thin read + render over
 * `teacherDirectoryService.listMyTeachers` (TASK-2301), same shape as
 * `student/exams` (server component, no client fetch). The nav entry
 * lives in `student-sidebar.tsx`.
 */

function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

export default async function StudentTeachersPage() {
  const t = await getTranslations("studentTeachers");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  const teachers = await teacherDirectoryService.listMyTeachers(session);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      {teachers.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teachers.map((teacher) => (
            <Card key={teacher.teacherId} className="flex flex-col gap-3">
              <CardHeader className="mb-0 flex-row items-center gap-3 space-y-0">
                {teacher.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teacher.avatarUrl}
                    alt={teacher.displayName}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {teacher.displayName.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <CardTitle className="truncate">{teacher.displayName}</CardTitle>
                  {teacher.subjectName && (
                    <p className="truncate text-xs text-foreground/60">{localizedText(teacher.subjectName, locale)}</p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground/60">{t("coursesCount", { count: teacher.courseCount })}</span>
                <Link href={`/${locale}/student/teachers/${teacher.teacherId}`}>
                  <Button type="button" variant="outline">
                    {t("viewCourses")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
