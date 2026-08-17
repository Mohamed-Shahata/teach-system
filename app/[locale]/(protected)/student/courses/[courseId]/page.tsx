import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { lessonService } from "@/lib/server/services/lessonService";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import type { LocalizedText } from "@/lib/server/repositories/courseRepository";
import { Breadcrumb, Badge } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

/**
 * TASK-3204 — a course's detail view, reached from a teacher's account
 * page (TASK-3203) by clicking one of their courses. Open to any
 * authenticated student regardless of enrollment/subscription — only
 * lesson *content* stays gated, at `lessonService.getLessonForStudent`
 * itself (server-side, TASK-3204's own acceptance criteria), not at
 * this page. `lessonService.listLessonsForCourseDetail` returns a
 * sanitized lesson list (title/order/preview-flag + a `locked` flag)
 * with no `video`/`fileIds`, so a locked lesson's content URL is never
 * present in this page's data in the first place.
 */

function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

export default async function StudentCourseDetailPage({
  params,
}: PageProps<"/[locale]/student/courses/[courseId]">) {
  const { courseId } = await params;
  const t = await getTranslations("studentCourses.detail");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  let course;
  try {
    course = await courseService.getCourseForStudent(session, courseId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }

  const [lessons, enrollment, subscribed, teacherProfile] = await Promise.all([
    lessonService.listLessonsForCourseDetail(session, courseId),
    enrollmentService.getMyEnrollmentForCourse(session, courseId),
    courseService.hasActiveSubscriptionForCourse(session, course),
    teacherProfileRepository.findByTeacherId(course.teacherId),
  ]);

  const enrolled = enrollment !== null && enrollment.status !== "cancelled";
  const teacherName = teacherProfile?.displayName;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        linkComponent={Link}
        items={[
          { label: t("breadcrumbTeachers"), href: `/${locale}/student/teachers` },
          ...(teacherName
            ? [{ label: teacherName, href: `/${locale}/student/teachers/${course.teacherId}` }]
            : []),
          { label: localizedText(course.title, locale) ?? course.title.en },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4 border-s-4 border-primary ps-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {localizedText(course.title, locale) ?? course.title.en}
          </h1>
          <p className="text-sm text-foreground/60">{t("lessonCount", { count: lessons.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {enrolled && <Badge variant="success">{t("enrolledBadge")}</Badge>}
          {!enrolled && subscribed && <Badge variant="success">{t("subscribedBadge")}</Badge>}
          <Badge variant="neutral">
            {course.enrollmentType === "free" || course.price === undefined
              ? t("free")
              : `${t("priceLabel")}: ${course.price} ${course.currency ?? ""}`.trim()}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm leading-6 text-foreground/80">
            {localizedText(course.description, locale) ?? t("noDescription")}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">{t("lessonsHeading")}</h2>
        {lessons.length === 0 ? (
          <EmptyState title={t("noLessons")} />
        ) : (
          <ol className="flex flex-col gap-1 rounded-lg border border-border p-2">
            {lessons.map((lesson) => {
              const canOpen = !lesson.locked;
              const label = localizedText(lesson.title, locale) ?? lesson.title.en;
              const content = (
                <div className="flex flex-1 items-center justify-between gap-2 px-2 py-2">
                  <span className="truncate text-sm text-foreground/80">{label}</span>
                  <div className="flex items-center gap-2">
                    {lesson.isFreePreview && <Badge variant="info">{t("freePreviewBadge")}</Badge>}
                    {lesson.locked && <Badge variant="neutral">{t("lockedBadge")}</Badge>}
                  </div>
                </div>
              );
              return (
                <li key={lesson.id}>
                  {canOpen ? (
                    <Link
                      href={`/${locale}/student/courses/${courseId}/lessons/${lesson.id}`}
                      className="flex items-center rounded-md hover:bg-surface-muted"
                      aria-label={t("goToLesson")}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-center opacity-60">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
