import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { quizService } from "@/lib/server/services/quizService";
import { educationStageRepository } from "@/lib/server/repositories/educationStageRepository";
import { quizAttemptService } from "@/lib/server/services/quizAttemptService";
import { Breadcrumb } from "@/components/ui";
import { QuestionManager } from "@/components/teacher/question-manager";
import { QuizGrading } from "@/components/teacher/quiz-grading";

/**
 * TASK-1203: a single quiz's question builder — reached from the
 * course detail page's `QuizManager` list ("manage questions").
 */
export default async function TeacherQuizDetailPage({
  params,
}: PageProps<"/[locale]/teacher/quizzes/[quizId]">) {
  const { locale, quizId } = await params;
  const t = await getTranslations();
  const session = await requireSession();
  assertRole(session, "teacher");

  let quiz;
  try {
    quiz = await quizService.getQuiz(session, quizId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const [course, stage, questions, attempts] = await Promise.all([
    quiz.courseId ? courseService.getCourse(session, quiz.courseId) : null,
    quiz.stageId ? educationStageRepository.findById(quiz.stageId) : null,
    quizService.listQuestions(session, quizId),
    // TASK-2103 — the grading queue only makes sense for manually-graded
    // quizzes; skip the extra fetch for auto-graded ones.
    quiz.autoGrade === false ? quizAttemptService.listAttemptsForQuiz(session, quizId) : Promise.resolve([]),
  ]);

  const breadcrumbItems = course
    ? [
        { label: t("teacherDashboard.nav.courses"), href: `/${locale}/teacher/courses` },
        { label: course.title.en || course.title.ar, href: `/${locale}/teacher/courses/${course.id}` },
        { label: quiz.title.en || quiz.title.ar },
      ]
    : [
        { label: t("teacherDashboard.nav.courses"), href: `/${locale}/teacher/courses` },
        ...(stage ? [{ label: stage.name.en || stage.name.ar }] : []),
        { label: quiz.title.en || quiz.title.ar },
      ];

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb items={breadcrumbItems} />
      <h1 className="text-2xl font-semibold text-foreground">{quiz.title.en || quiz.title.ar}</h1>
      <QuestionManager quizId={quizId} initialQuestions={questions} />
      {quiz.autoGrade === false && (
        <QuizGrading quizId={quizId} questions={questions} initialAttempts={attempts} />
      )}
    </div>
  );
}
