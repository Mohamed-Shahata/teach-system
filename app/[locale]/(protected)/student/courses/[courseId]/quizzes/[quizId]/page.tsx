import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";
import { quizAttemptService } from "@/lib/server/services/quizAttemptService";
import { Breadcrumb } from "@/components/ui";
import { QuizTaker } from "@/components/quiz/quiz-taker";

/**
 * TASK-1204 — quiz-taking UI (student) & results view. Per
 * `architecture/folder-structure.md`:
 * `student/courses/[courseId]/quizzes/[quizId]/page.tsx`.
 *
 * `quizService.getQuiz` (extended for students in this task) gates on
 * `published` + enrollment before this page renders anything;
 * `listQuestionsForStudent` (TASK-1202) strips `correctOptionIds`
 * before it ever reaches the client. Both attempt history and
 * submission then flow through `QuizTaker` / `quizAttemptService`
 * (TASK-1202) — this page does no grading of its own.
 *
 * There's no `student/courses/[courseId]/page.tsx` yet (only the
 * course *list* on the dashboard exists so far, and its cards aren't
 * linked anywhere — see `studentDashboard`'s TASK-1103 note), so this
 * page isn't reachable from student navigation yet either. Revisit
 * once a student course-detail page lands and can link to a course's
 * quizzes the way `teacher/courses/[courseId]` links to
 * `teacher/quizzes/[quizId]`.
 */
export default async function StudentQuizPage({
  params,
}: PageProps<"/[locale]/student/courses/[courseId]/quizzes/[quizId]">) {
  const { locale, courseId, quizId } = await params;
  const t = await getTranslations("studentQuiz");
  const session = await requireSession();
  assertRole(session, "student");

  let quiz;
  try {
    quiz = await quizService.getQuiz(session, quizId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  if (quiz.courseId !== courseId) {
    notFound();
  }

  const [questions, attempts] = await Promise.all([
    quizService.listQuestionsForStudent(quizId),
    quizAttemptService.listMyAttempts(session, quizId),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("breadcrumbCourses"), href: `/${locale}/student/dashboard` },
          { label: quiz.title.en || quiz.title.ar },
        ]}
      />
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-2xl font-semibold text-foreground">{quiz.title.en || quiz.title.ar}</h1>
        <p className="text-sm text-foreground/60">{t("subtitle")}</p>
      </div>
      <QuizTaker quizId={quizId} questions={questions} initialAttempts={attempts} />
    </div>
  );
}
