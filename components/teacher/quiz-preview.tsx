"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Dialog } from "@/components/ui";
import { QuizTaker } from "@/components/quiz/quiz-taker";
import type { PublicQuestionDoc } from "@/lib/server/repositories/questionRepository";

interface QuizPreviewProps {
  quizId: string;
}

/**
 * TASK-3106 — owning teacher/Admin's "Preview" action, reused for both
 * course-attached quizzes (`QuizManager`, course mode) and standalone
 * exams (`QuizManager`, course-less mode) and the quiz detail page —
 * one component, three call sites, same pattern `TableActionsMenu`
 * (Phase 35) will later apply to the surrounding action buttons.
 * Fetches `GET /api/quizzes/[quizId]/preview` (works regardless of
 * `status`, unlike the student-facing question read) only once the
 * dialog is actually opened — no need to pay for the request on every
 * quiz row render.
 */
export function QuizPreview({ quizId }: QuizPreviewProps) {
  const t = useTranslations("teacherDashboard.quizzes");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<PublicQuestionDoc[] | null>(null);

  async function openPreview() {
    setOpen(true);
    setError(null);
    setQuestions(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/preview`);
      if (!res.ok) {
        setError(t("errors.previewLoad"));
        return;
      }
      const body = (await res.json()) as { questions: PublicQuestionDoc[] };
      setQuestions(body.questions);
    } catch {
      setError(t("errors.previewLoad"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openPreview}>
        {t("preview")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title={t("previewTitle")} description={t("previewSubtitle")} size="lg">
        <div className="flex flex-col gap-3">
          <Alert variant="info">{t("previewNotice")}</Alert>
          {error && <Alert variant="error">{error}</Alert>}
          {loading && <p className="text-sm text-foreground/60">{t("previewLoading")}</p>}
          {!loading && !error && questions && questions.length === 0 && (
            <p className="text-sm text-foreground/60">{t("previewEmpty")}</p>
          )}
          {!loading && questions && questions.length > 0 && (
            <QuizTaker quizId={quizId} questions={questions} initialAttempts={[]} mode="preview" />
          )}
        </div>
      </Dialog>
    </>
  );
}
