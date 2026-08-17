import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { NotFoundError } from "@/lib/errors";
import { teacherDirectoryService } from "@/lib/server/services/teacherDirectoryService";
import { reviewService } from "@/lib/server/services/reviewService";
import type { LocalizedText } from "@/lib/server/repositories/subjectRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Badge, Breadcrumb } from "@/components/ui";
import { TeacherReviewForm } from "@/components/student/teacher-review-form";

/**
 * TASK-3203 — a teacher's account view, reached from either tab of the
 * "Teachers" directory (`../page.tsx`). No longer gated on the student
 * already having a relationship with the teacher (that was TASK-2303's
 * scope) — `teacherDirectoryService.getTeacherAccountView` is open to any
 * authenticated student, and now returns the TASK-3101 profile-detail
 * fields (headline/bio/experience/specialization/social links) shown
 * here alongside the same public course list TASK-2303 rendered. Course
 * cards link to TASK-3204's course detail page
 * (`student/courses/[courseId]`), which handles content access-gating
 * itself.
 */

function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

export default async function StudentTeacherAccountPage({
  params,
}: PageProps<"/[locale]/student/teachers/[teacherId]">) {
  const { teacherId } = await params;
  const t = await getTranslations("studentTeachers");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  let data;
  try {
    data = await teacherDirectoryService.getTeacherAccountView(session, teacherId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const myReview = await reviewService.getMyReview(session, teacherId);

  const socialLinks = data.socialLinks
    ? Object.entries(data.socialLinks).filter(([, url]) => Boolean(url))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: t("title"), href: `/${locale}/student/teachers` },
          { label: data.displayName },
        ]}
      />

      <div className="flex flex-wrap items-start gap-4 border-s-4 border-primary ps-4">
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.avatarUrl} alt={data.displayName} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {data.displayName.charAt(0)}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{data.displayName}</h1>
            {data.subscribed && <Badge variant="success">{t("subscribedBadge")}</Badge>}
          </div>
          {data.headline && <p className="text-sm text-foreground/70">{localizedText(data.headline, locale)}</p>}
          {data.subjectName && <p className="text-sm text-foreground/60">{localizedText(data.subjectName, locale)}</p>}
        </div>
      </div>

      {(data.bio || data.yearsOfExperience !== undefined || data.specialization || socialLinks.length > 0) && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            {data.bio && <p className="text-sm leading-6 text-foreground/80">{localizedText(data.bio, locale)}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-foreground/60">
              {data.yearsOfExperience !== undefined && (
                <span>{t("experienceLabel", { years: data.yearsOfExperience })}</span>
              )}
              {data.specialization && <span>{data.specialization}</span>}
            </div>
            {socialLinks.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {socialLinks.map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {key}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.courses.length === 0 ? (
        <EmptyState title={t("emptyCoursesTitle")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.courses.map((course) => (
            <Link key={course.courseId} href={`/${locale}/student/courses/${course.courseId}`} className="block">
              <Card className="flex h-full flex-col gap-3 transition-colors hover:border-primary">
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
            </Link>
          ))}
        </div>
      )}

      {(data.subscribed || data.courses.some((c) => c.enrolled)) && (
        <TeacherReviewForm teacherId={teacherId} initialReview={myReview} />
      )}
    </div>
  );
}
