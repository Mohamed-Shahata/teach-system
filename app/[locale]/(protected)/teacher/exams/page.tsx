import { getTranslations } from "next-intl/server";
import { assertRole } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { quizService } from "@/lib/server/services/quizService";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { QuizManager } from "@/components/teacher/quiz-manager";

/**
 * TASK-2105 — teacher-facing standalone (course-less) exam management.
 * Same builder as the course detail page's `QuizManager` (TASK-1203),
 * entry point here instead of a course, so it's rendered in its
 * course-less mode (no `courseId` prop) — see that component for the
 * branch. `stages` comes from the same lookup collection
 * `teacher/courses` already reads (TASK-1905); a standalone exam has
 * no teacher-assigned subject to narrow by, so every stage is offered.
 */
export default async function TeacherExamsPage() {
  const t = await getTranslations();
  const session = await requireSession();
  assertRole(session, "teacher");

  const [quizzes, stages] = await Promise.all([
    quizService.listStandaloneQuizzes(session),
    centerConfigService.listEducationStages(session),
  ]);

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-foreground">{t("teacherDashboard.nav.exams")}</h1>
      <QuizManager initialQuizzes={quizzes} stages={stages} />
    </div>
  );
}
