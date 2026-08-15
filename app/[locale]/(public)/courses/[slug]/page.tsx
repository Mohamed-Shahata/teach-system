import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { NotFoundError } from "@/lib/errors";
import { publicService } from "@/lib/server/services/publicService";
import type { LocalizedText } from "@/lib/server/repositories/courseRepository";

/**
 * TASK-1403 — `/courses/[slug]` public course page. Same anonymous,
 * `publicService`-only access pattern as TASK-1402's teacher page — no
 * `requireSession`, no direct `courseRepository` use.
 */

function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

export default async function PublicCoursePage({ params }: PageProps<"/[locale]/courses/[slug]">) {
  const { locale, slug } = await params;
  const t = await getTranslations("publicPages.coursePage");

  let page;
  try {
    page = await publicService.getCoursePageBySlug(slug);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const { course, teacher } = page;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      {course.thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={course.thumbnailUrl}
          alt={localizedText(course.title, locale) ?? ""}
          className="aspect-video w-full rounded-lg object-cover"
        />
      )}

      <h1 className="text-2xl font-semibold text-foreground">{localizedText(course.title, locale)}</h1>

      {teacher && (
        <Link
          href={`/${locale}/teachers/${teacher.slug}`}
          className="w-fit text-sm text-primary hover:underline"
        >
          {t("byTeacher", { name: teacher.displayName })}
        </Link>
      )}

      {course.description && (
        <p className="text-foreground/80">{localizedText(course.description, locale)}</p>
      )}
    </div>
  );
}
