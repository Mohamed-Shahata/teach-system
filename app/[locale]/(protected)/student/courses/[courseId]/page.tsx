import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { lessonService } from "@/lib/server/services/lessonService";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { Badge } from "@/components/ui";
import { CourseDetailView, localizedText } from "@/components/course/course-detail-view";

/**
 * TASK-3204 — a course's detail view, reached from a teacher's account
 * page (TASK-3203) by clicking one of their courses. Open to any
 * authenticated student regardless of enrollment/subscription — only
 * lesson *content* stays gated, at `lessonService.getLessonForStudent`
 * itself (server-side, TASK-3204's own acceptance criteria), not at
 * this page. `lessonService.listLessonsForCourseDetail` returns a
 * sanitized lesson list (title/order/preview-flag + a `locked` flag)
 * with no `video`/`fileIds`, so a locked lesson's content is never
 * present in this page's data in the first place.
 *
 * Rendering itself lives in `components/course/course-detail-view.tsx`
 * (TASK-3104 extracted it so the teacher's course-preview page can
 * reuse the exact same markup for the exact same lesson shape).
 */
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
    <CourseDetailView
      breadcrumbItems={[
        { label: t("breadcrumbTeachers"), href: `/${locale}/student/teachers` },
        ...(teacherName
          ? [{ label: teacherName, href: `/${locale}/student/teachers/${course.teacherId}` }]
          : []),
        { label: localizedText(course.title, locale) ?? course.title.en },
      ]}
      title={localizedText(course.title, locale) ?? course.title.en}
      badges={
        <>
          {enrolled && <Badge variant="success">{t("enrolledBadge")}</Badge>}
          {!enrolled && subscribed && <Badge variant="success">{t("subscribedBadge")}</Badge>}
          <Badge variant="neutral">
            {course.enrollmentType === "free" || course.price === undefined
              ? t("free")
              : `${t("priceLabel")}: ${course.price} ${course.currency ?? ""}`.trim()}
          </Badge>
        </>
      }
      description={localizedText(course.description, locale) ?? t("noDescription")}
      lessons={lessons}
      locale={locale}
      lessonHref={(lessonId) => `/${locale}/student/courses/${courseId}/lessons/${lessonId}`}
      labels={{
        lessonCount: t("lessonCount", { count: lessons.length }),
        lessonsHeading: t("lessonsHeading"),
        noLessons: t("noLessons"),
        freePreviewBadge: t("freePreviewBadge"),
        lockedBadge: t("lockedBadge"),
        goToLesson: t("goToLesson"),
      }}
    />
  );
}
