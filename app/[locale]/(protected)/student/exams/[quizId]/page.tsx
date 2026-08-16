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
 * TASK-2104 — the taking flow for a standalone (course-less) exam,
 * mirroring `student/courses/[courseId]/quizzes/[quizId]` (TASK-1204)
 * but reached from `student/exams` instead of a course. `getQuiz`'s
 * `loadQuizForStudent` (extended in this task) already gates on the
 * student's `stageId` matching + the exam being open before this page
 * renders anything, and `listQuestionsForStudent`/`QuizTaker` are
 * reused as-is — a standalone exam's question list and submission
 * flow are identical to a course quiz's, only the enrollment check
 * differs (handled entirely in the service layer).
 */
export default async function StudentExamPage({
  params,
}: PageProps<"/[locale]/student/exams/[quizId]">) {
  const { locale, quizId } = await params;
  const t = await getTranslations("studentExams");
  const session = await requireSession();
  assertRole(session, "student");

  let quiz;
  try {
    quiz = await quizService.getQuiz(session, quizId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  // This route is standalone exams only — a course-attached quiz belongs
  // under student/courses/[courseId]/quizzes/[quizId] instead.
  if (quiz.courseId) {
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
          { label: t("breadcrumbExams"), href: `/${locale}/student/exams` },
          { label: quiz.title.en || quiz.title.ar },
        ]}
      />
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-2xl font-semibold text-foreground">{quiz.title.en || quiz.title.ar}</h1>
        <p className="text-sm text-foreground/60">{t("takeSubtitle")}</p>
      </div>
      <QuizTaker quizId={quizId} questions={questions} initialAttempts={attempts} />
    </div>
  );
}
