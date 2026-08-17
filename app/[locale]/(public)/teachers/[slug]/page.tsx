import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { NotFoundError } from "@/lib/errors";
import { publicService } from "@/lib/server/services/publicService";
import type { LocalizedText } from "@/lib/server/repositories/courseRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

/**
 * TASK-1402 — `/teachers/[slug]` public profile page. Per
 * `architecture/folder-structure.md` this lives under `(public)`, has no
 * `requireSession`/`assertRole` (anonymous visitors), and only ever
 * reads through `publicService` — never the teacher-facing
 * `teacherProfileRepository`/`courseRepository` directly, so it can't
 * accidentally leak a non-public field.
 */

// Public, anonymous, and identical for every visitor — cache the rendered
// page for a minute (ISR) instead of hitting Firestore on every request.
export const revalidate = 60;

function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

export default async function PublicTeacherProfilePage({
  params,
}: PageProps<"/[locale]/teachers/[slug]">) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("publicPages.teacherProfile");

  let page;
  try {
    page = await publicService.getTeacherPageBySlug(slug);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const { profile, courses, reviews } = page;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
            {profile.displayName.charAt(0)}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">{profile.displayName}</h1>
          {profile.bio && <p className="text-sm text-foreground/60">{profile.bio}</p>}
          {reviews.reviewCount > 0 && (
            <p className="text-sm text-foreground/60">
              {t("averageRating", { rating: reviews.averageRating, count: reviews.reviewCount })}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">{t("coursesHeading")}</h2>
        {courses.length === 0 ? (
          <EmptyState title={t("emptyCourses")} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle>{localizedText(course.title, locale)}</CardTitle>
                </CardHeader>
                {course.description && (
                  <CardContent>{localizedText(course.description, locale)}</CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">{t("reviewsHeading")}</h2>
        {reviews.reviews.length === 0 ? (
          <EmptyState title={t("emptyReviews")} />
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.reviews.map((review) => (
              <Card key={review.id}>
                <CardHeader className="mb-0 flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-sm">{review.studentFirstName}</CardTitle>
                  <span className="text-sm font-medium text-foreground/60" aria-label={`${review.rating}/5`}>
                    {review.rating}/5
                  </span>
                </CardHeader>
                {review.comment && <CardContent className="text-sm text-foreground/70">{review.comment}</CardContent>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
