import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { lessonService } from "@/lib/server/services/lessonService";
import { quizService } from "@/lib/server/services/quizService";
import { Breadcrumb } from "@/components/ui";
import { LessonManager } from "@/components/teacher/lesson-manager";
import { QuizManager } from "@/components/teacher/quiz-manager";

/**
 * TASK-903: course detail page — currently just the lesson manager
 * (list/create/edit/delete/reorder). Per `architecture/folder-structure.md`
 * this is `teacher/courses/[courseId]/page.tsx`.
 */
export default async function TeacherCourseDetailPage({
  params,
}: PageProps<"/[locale]/teacher/courses/[courseId]">) {
  const { locale, courseId } = await params;
  const t = await getTranslations();
  const session = await requireSession();
  assertRole(session, "teacher");

  let course;
  try {
    course = await courseService.getCourse(session, courseId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const lessons = await lessonService.listLessons(session, courseId);
  const quizzes = await quizService.listQuizzes(session, courseId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("teacherDashboard.nav.courses"), href: `/${locale}/teacher/courses` },
          { label: course.title.en || course.title.ar },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">{course.title.en || course.title.ar}</h1>
      <LessonManager courseId={courseId} initialLessons={lessons} />
      <QuizManager courseId={courseId} initialQuizzes={quizzes} />
    </div>
  );
}
