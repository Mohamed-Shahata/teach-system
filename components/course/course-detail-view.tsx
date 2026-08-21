import type { ReactNode } from "react";
import Link from "next/link";
import type { LocalizedText } from "@/lib/server/repositories/courseRepository";
import { Breadcrumb, Badge } from "@/components/ui";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

/**
 * TASK-3104 — extracted from the student course-detail page
 * (TASK-3204) so a teacher's "preview as a student would see it" page
 * can render identically off the same lesson shape
 * (`lessonService.listLessonsForCourseDetail` /
 * `listLessonsForCoursePreview`), rather than a second hand-maintained
 * copy of this markup. Purely presentational — no data fetching, no
 * `assertRole`/ownership logic; callers resolve translations and build
 * the breadcrumb/badges themselves so this component has no opinion on
 * which audience (student vs. owning teacher) is looking at it.
 */

export function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

export interface CourseDetailLesson {
  id: string;
  title: LocalizedText;
  isFreePreview: boolean;
  locked: boolean;
}

export interface CourseDetailViewProps {
  breadcrumbItems: { label: string; href?: string }[];
  title: string;
  badges: ReactNode;
  description: string;
  lessons: CourseDetailLesson[];
  locale: string;
  /** Builds the href for an unlocked lesson row; omit to render rows as plain (non-link) text. */
  lessonHref?: (lessonId: string) => string;
  labels: {
    lessonCount: string;
    lessonsHeading: string;
    noLessons: string;
    freePreviewBadge: string;
    lockedBadge: string;
    goToLesson: string;
  };
}

export function CourseDetailView({
  breadcrumbItems,
  title,
  badges,
  description,
  lessons,
  locale,
  lessonHref,
  labels,
}: CourseDetailViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb linkComponent={Link} items={breadcrumbItems} />

      <div className="flex flex-wrap items-start justify-between gap-4 border-s-4 border-primary ps-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-foreground/60">{labels.lessonCount}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm leading-6 text-foreground/80">{description}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">{labels.lessonsHeading}</h2>
        {lessons.length === 0 ? (
          <EmptyState title={labels.noLessons} />
        ) : (
          <ol className="flex flex-col gap-1 rounded-lg border border-border p-2">
            {lessons.map((lesson) => {
              const href = !lesson.locked ? lessonHref?.(lesson.id) : undefined;
              const label = localizedText(lesson.title, locale) ?? lesson.title.en;
              const content = (
                <div className="flex flex-1 items-center justify-between gap-2 px-2 py-2">
                  <span className="truncate text-sm text-foreground/80">{label}</span>
                  <div className="flex items-center gap-2">
                    {lesson.isFreePreview && <Badge variant="info">{labels.freePreviewBadge}</Badge>}
                    {lesson.locked && <Badge variant="neutral">{labels.lockedBadge}</Badge>}
                  </div>
                </div>
              );
              return (
                <li key={lesson.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="flex items-center rounded-md hover:bg-surface-muted"
                      aria-label={labels.goToLesson}
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
