import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { lessonService } from "@/lib/server/services/lessonService";
import { Badge, Alert } from "@/components/ui";
import { CourseDetailView, localizedText } from "@/components/course/course-detail-view";

/**
 * TASK-3104 — course preview before publish. Reuses `CourseDetailView`
 * (extracted from the student-facing page, TASK-3204) so the teacher
 * sees exactly the same markup a student would; the only differences
 * are the data reads (`getCourseForPreview`/`listLessonsForCoursePreview`,
 * owner-gated + status-agnostic instead of enrollment-gated) and the
 * breadcrumb pointing back to the course editor instead of the
 * teachers directory. `status` is never changed by viewing this page.
 */
export default async function TeacherCoursePreviewPage({
  params,
}: PageProps<"/[locale]/teacher/courses/[courseId]/preview">) {
  const { locale, courseId } = await params;
  const t = await getTranslations("teacherDashboard.courses.preview");
  const session = await requireSession();

  let course;
  try {
    course = await courseService.getCourseForPreview(session, courseId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }
  const lessons = await lessonService.listLessonsForCoursePreview(session, courseId);
  const title = localizedText(course.title, locale) ?? course.title.en;

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="warning">{t("banner")}</Alert>
      <CourseDetailView
        breadcrumbItems={[
          { label: t("breadcrumbCourses"), href: `/${locale}/teacher/courses` },
          { label: title, href: `/${locale}/teacher/courses/${courseId}` },
          { label: t("breadcrumbPreview") },
        ]}
        title={title}
        badges={
          <Badge variant="neutral">
            {course.enrollmentType === "free" || course.price === undefined
              ? t("free")
              : `${t("priceLabel")}: ${course.price} ${course.currency ?? ""}`.trim()}
          </Badge>
        }
        description={localizedText(course.description, locale) ?? t("noDescription")}
        lessons={lessons}
        locale={locale}
        labels={{
          lessonCount: t("lessonCount", { count: lessons.length }),
          lessonsHeading: t("lessonsHeading"),
          noLessons: t("noLessons"),
          freePreviewBadge: t("freePreviewBadge"),
          lockedBadge: t("lockedBadge"),
          goToLesson: t("goToLesson"),
        }}
      />
    </div>
  );
}
