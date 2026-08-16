import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { teacherDirectoryService } from "@/lib/server/services/teacherDirectoryService";
import type { LocalizedText } from "@/lib/server/repositories/subjectRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Badge, Breadcrumb } from "@/components/ui";

/**
 * TASK-2303 — a single teacher's published courses, reached from
 * TASK-2302's "My teachers" list. Not a full browse/buy storefront
 * redesign, per this task's own description — just the public course
 * list (`publicRepository`, same source `/teachers/[slug]` uses) with
 * an `enrolled` flag layered on by `teacherDirectoryService.
 * getTeacherCoursesForStudent` (TASK-2301's service, extended).
 */

function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

export default async function StudentTeacherCoursesPage({
  params,
}: PageProps<"/[locale]/student/teachers/[teacherId]">) {
  const { teacherId } = await params;
  const t = await getTranslations("studentTeachers");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  let data;
  try {
    data = await teacherDirectoryService.getTeacherCoursesForStudent(session, teacherId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: t("title"), href: `/${locale}/student/teachers` },
          { label: data.displayName },
        ]}
      />

      <div className="flex items-center gap-3 border-s-4 border-primary ps-4">
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.avatarUrl} alt={data.displayName} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {data.displayName.charAt(0)}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">{data.displayName}</h1>
          {data.subjectName && <p className="text-sm text-foreground/60">{localizedText(data.subjectName, locale)}</p>}
        </div>
      </div>

      {data.courses.length === 0 ? (
        <EmptyState title={t("emptyCoursesTitle")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.courses.map((course) => (
            <Card key={course.courseId} className="flex flex-col gap-3">
              <CardHeader className="mb-0 flex-row items-start justify-between gap-2 space-y-0">
                <CardTitle className="line-clamp-2">{localizedText(course.title, locale)}</CardTitle>
                <Badge variant={course.enrolled ? "success" : "neutral"}>
                  {course.enrolled ? t("enrolledBadge") : t("availableBadge")}
                </Badge>
              </CardHeader>
              {course.description && (
                <CardContent className="line-clamp-3 text-sm text-foreground/60">
                  {localizedText(course.description, locale)}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
