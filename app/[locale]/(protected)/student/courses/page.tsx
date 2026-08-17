import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import type { LocalizedText } from "@/lib/server/repositories/courseRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

/**
 * TASK-3202 — "My Courses": every course the student has an *active*
 * enrollment in (a `completed`/`cancelled` enrollment has nothing left
 * to continue, so it's left off this list — it still shows on
 * `student/dashboard`, which is the full-history overview), each with
 * a progress bar and a "Continue" action that opens the course at its
 * `resumeLessonId` (`enrollmentService.listMyActiveCoursesWithProgress`
 * — first not-yet-completed lesson in course order, or the last lesson
 * if every lesson is done).
 */

function localizedTitle(title: LocalizedText, locale: string): string {
  return (locale === "ar" ? title.ar : title.en) || title.en || title.ar;
}

export default async function StudentCoursesPage() {
  const t = await getTranslations("studentCourses");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  const items = await enrollmentService.listMyActiveCoursesWithProgress(session);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ enrollment, course, resumeLessonId }) => {
            const title = course ? localizedTitle(course.title, locale) : t("unknownCourse");
            const percent = enrollment.progress.percent;
            const continueHref = resumeLessonId
              ? `/${locale}/student/courses/${enrollment.courseId}/lessons/${resumeLessonId}`
              : undefined;

            return (
              <Card key={enrollment.id} className="flex flex-col gap-3">
                <CardHeader className="mb-0">
                  <CardTitle className="line-clamp-2">
                    {continueHref ? (
                      <Link href={continueHref} className="hover:underline">
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <div
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t("progressLabel")}
                      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-foreground/60">
                      {t("progressCaption", {
                        percent,
                        completed: enrollment.progress.completedLessonIds.length,
                      })}
                    </p>
                  </div>

                  <div className="mt-auto">
                    {continueHref ? (
                      <Link href={continueHref} className="block">
                        <Button type="button" className="w-full">
                          {percent > 0 ? t("continue") : t("start")}
                        </Button>
                      </Link>
                    ) : (
                      <Button type="button" className="w-full" disabled>
                        {t("noLessons")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
