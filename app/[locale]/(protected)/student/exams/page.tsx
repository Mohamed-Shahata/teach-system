import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { quizService } from "@/lib/server/services/quizService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

/**
 * TASK-2104 — a student's "exams for my stage" list: standalone
 * (course-less) exams, published and already open (`scheduledAt <=
 * now`), targeting the signed-in student's own `stageId`.
 * `quizService.listExamsForStudent` does the stage lookup + filtering;
 * this page is a thin read + render, same shape as `student/dashboard`.
 */
export default async function StudentExamsPage() {
  const t = await getTranslations("studentExams");
  const locale = await getLocale();
  const session = await requireSession();
  assertRole(session, "student");

  const exams = await quizService.listExamsForStudent(session);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      {exams.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="flex flex-col gap-3">
              <CardHeader className="mb-0">
                <CardTitle className="line-clamp-2">{exam.title.en || exam.title.ar}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/${locale}/student/exams/${exam.id}`}>
                  <Button type="button">{t("openExam")}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
