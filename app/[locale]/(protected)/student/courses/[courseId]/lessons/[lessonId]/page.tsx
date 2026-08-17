import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { lessonService } from "@/lib/server/services/lessonService";
import { courseService } from "@/lib/server/services/courseService";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import type { LocalizedText } from "@/lib/server/repositories/courseRepository";
import { Breadcrumb, Badge } from "@/components/ui";
import { LessonPlayer } from "@/components/student/lesson-player";
import { MarkLessonCompleteButton } from "@/components/student/mark-lesson-complete-button";

/**
 * TASK-3202 — the student lesson player, reached from `student/courses`
 * (dashboard/"My Courses" card, "Continue"/"Start") or a lesson-to-lesson
 * "Next" link. Access is gated entirely by
 * `lessonService.getLessonForStudent` (free-preview, or enrollment) —
 * this page does no gating of its own beyond that read succeeding.
 *
 * Course-wide lesson order (for prev/next + the sidebar list) comes
 * from `courseService.getCourseForStudent`/`lessonService
 * .listLessonsForStudent`, which are intentionally *not*
 * enrollment-gated (see their doc comments) — a free-preview visitor
 * still needs the course's lesson list to know what "next" even is,
 * even though only the flagged lesson itself is actually playable for
 * them.
 */

function localizedTitle(title: LocalizedText, locale: string): string {
  return (locale === "ar" ? title.ar : title.en) || title.en || title.ar;
}

export default async function StudentLessonPage({
  params,
}: PageProps<"/[locale]/student/courses/[courseId]/lessons/[lessonId]">) {
  const { locale, courseId, lessonId } = await params;
  const t = await getTranslations("studentCourses.lesson");
  const session = await requireSession();
  assertRole(session, "student");

  let lesson;
  try {
    lesson = await lessonService.getLessonForStudent(session, lessonId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }
  if (lesson.courseId !== courseId) {
    notFound();
  }

  const [course, courseLessons, enrollment] = await Promise.all([
    courseService.getCourseForStudent(session, courseId),
    lessonService.listLessonsForStudent(session, courseId),
    enrollmentService.getMyEnrollmentForCourse(session, courseId),
  ]);

  const index = course.lessonOrder.indexOf(lessonId);
  const prevLessonId = index > 0 ? course.lessonOrder[index - 1] : undefined;
  const nextLessonId = index >= 0 && index < course.lessonOrder.length - 1 ? course.lessonOrder[index + 1] : undefined;
  const completed = enrollment?.progress.completedLessonIds.includes(lessonId) ?? false;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        linkComponent={Link}
        items={[
          { label: t("breadcrumbCourses"), href: `/${locale}/student/courses` },
          { label: localizedTitle(course.title, locale) },
        ]}
      />

      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{lesson.title.en || lesson.title.ar}</h1>
          {lesson.isFreePreview && <Badge variant="info">{t("freePreview")}</Badge>}
        </div>
        <p className="text-sm text-foreground/60">{localizedTitle(course.title, locale)}</p>
      </div>

      {lesson.video ? (
        <LessonPlayer lessonId={lesson.id} video={lesson.video} title={lesson.title.en || lesson.title.ar} />
      ) : (
        <p className="text-sm text-foreground/60">{t("noVideo")}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {prevLessonId && (
            <Link
              href={`/${locale}/student/courses/${courseId}/lessons/${prevLessonId}`}
              className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              {t("previous")}
            </Link>
          )}
          {nextLessonId && (
            <Link
              href={`/${locale}/student/courses/${courseId}/lessons/${nextLessonId}`}
              className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted"
            >
              {t("next")}
            </Link>
          )}
        </div>

        {enrollment && (
          <MarkLessonCompleteButton enrollmentId={enrollment.id} lessonId={lessonId} alreadyCompleted={completed} />
        )}
      </div>

      {courseLessons.length > 1 && (
        <div className="flex flex-col gap-1 rounded-lg border border-border p-4">
          <p className="mb-1 text-sm font-medium text-foreground">{t("lessonsInCourse")}</p>
          <ol className="flex flex-col gap-1">
            {courseLessons.map((item) => {
              const isCurrent = item.id === lessonId;
              const isDone = enrollment?.progress.completedLessonIds.includes(item.id) ?? false;
              return (
                <li key={item.id}>
                  <Link
                    href={`/${locale}/student/courses/${courseId}/lessons/${item.id}`}
                    className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm ${
                      isCurrent ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-surface-muted"
                    }`}
                  >
                    <span className="truncate">{item.title.en || item.title.ar}</span>
                    {isDone && <Badge variant="success">{t("done")}</Badge>}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
