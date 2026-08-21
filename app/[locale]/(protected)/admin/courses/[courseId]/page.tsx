import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { lessonService } from "@/lib/server/services/lessonService";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { Badge } from "@/components/ui";
import { CourseDetailView, localizedText } from "@/components/course/course-detail-view";

/**
 * TASK-3306 — Admin, read-only, full-content view of any course
 * (regardless of enrollment/status). Reuses `CourseDetailView`
 * (TASK-3104) and, deliberately, the *existing* student-facing reads
 * rather than new Admin-specific ones: `courseService.getCourseForStudent`
 * and `lessonService.listLessonsForCourseDetail` already accept an
 * `admin` session and already resolve `locked: false` for every lesson
 * under one (see each method's own doc comment — `session.role ===
 * "admin"` was already a `hasAccess` branch, added for exactly this
 * kind of read before this task existed). No edit controls are
 * rendered here — editing stays on the teacher-facing course editor.
 */
export default async function AdminCourseDetailPage({
  params,
}: PageProps<"/[locale]/admin/courses/[courseId]">) {
  const { locale, courseId } = await params;
  const t = await getTranslations("adminDashboard.courseOverview.detail");
  const session = await requireSession();
  assertRole(session, "admin");

  let course;
  try {
    course = await courseService.getCourseForStudent(session, courseId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }

  const [lessons, teacherProfile] = await Promise.all([
    lessonService.listLessonsForCourseDetail(session, courseId),
    teacherProfileRepository.findByTeacherId(course.teacherId),
  ]);

  const title = localizedText(course.title, locale) ?? course.title.en;
  const teacherName = teacherProfile?.displayName;

  return (
    <CourseDetailView
      breadcrumbItems={[
        { label: t("breadcrumbCourses"), href: `/${locale}/admin/courses` },
        { label: title },
      ]}
      title={title}
      badges={
        <>
          <Badge variant={course.status === "published" ? "success" : "neutral"}>
            {course.status === "published" ? t("statusPublished") : t("statusDraft")}
          </Badge>
          {teacherName && <Badge variant="neutral">{teacherName}</Badge>}
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
