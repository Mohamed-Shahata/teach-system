"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button, Dialog, EmptyState, Input } from "@/components/ui";
import type { QuestionDoc } from "@/lib/server/repositories/questionRepository";
import type { QuizAttemptDoc } from "@/lib/server/repositories/quizAttemptRepository";

interface QuizGradingProps {
  quizId: string;
  questions: QuestionDoc[];
  initialAttempts: QuizAttemptDoc[];
}

/**
 * TASK-2103: manual grading screen for `autoGrade: false` quizzes —
 * rendered on the teacher quiz detail page (`teacher/quizzes/[quizId]`)
 * alongside `QuestionManager`, since a manually-graded quiz's questions
 * and its `pending_review` queue are both scoped to the same quiz.
 * `GET /api/quizzes/[quizId]/attempts` now returns every attempt for a
 * teacher/Admin caller (branches off `listAttemptsForQuiz`); grading a
 * single attempt goes through `PATCH .../attempts/[attemptId]/grade`.
 */
export function QuizGrading({ quizId, questions, initialAttempts }: QuizGradingProps) {
  const t = useTranslations("teacherDashboard.quizzes.grading");
  const [attempts, setAttempts] = React.useState(initialAttempts);
  const [gradingTarget, setGradingTarget] = React.useState<QuizAttemptDoc | null>(null);
  const [scoreInput, setScoreInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const questionById = React.useMemo(() => new Map(questions.map((question) => [question.id, question])), [
    questions,
  ]);

  const pendingAttempts = attempts.filter((attempt) => attempt.status === "pending_review");
  const gradedAttempts = attempts.filter((attempt) => attempt.status !== "pending_review");

  function openGradingDialog(attempt: QuizAttemptDoc) {
    setGradingTarget(attempt);
    setScoreInput("");
    setError(null);
  }

  async function refresh() {
    const res = await fetch(`/api/quizzes/${quizId}/attempts`);
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { attempts: QuizAttemptDoc[] };
    setAttempts(body.attempts);
  }

  async function submitGrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gradingTarget) return;
    const score = Number(scoreInput);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      setError(t("errors.scoreRange"));
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempts/${gradingTarget.id}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      if (!res.ok) {
        setError(t("errors.save"));
        return;
      }
      await refresh();
      setGradingTarget(null);
    } catch {
      setError(t("errors.save"));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
        <p className="mt-1 text-xs text-foreground/60">{t("subtitle")}</p>
      </div>

      {error && !gradingTarget && <Alert variant="error">{error}</Alert>}

      {pendingAttempts.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t("pendingHeading")}>
          {pendingAttempts.map((attempt) => (
            <li
              key={attempt.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <div>
                <p className="font-medium text-foreground">{t("studentAttempt", { id: attempt.studentId })}</p>
                <Badge variant="warning">{t("status.pending_review")}</Badge>
              </div>
              <Button type="button" size="sm" onClick={() => openGradingDialog(attempt)}>
                {t("grade")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {gradedAttempts.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-foreground/70">{t("gradedHeading")}</p>
          <ul className="flex flex-col gap-2" aria-label={t("gradedHeading")}>
            {gradedAttempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm"
              >
                <span>{t("studentAttempt", { id: attempt.studentId })}</span>
                <Badge variant="success">{t("scoreLabel", { score: attempt.score })}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog
        open={!!gradingTarget}
        onOpenChange={(open) => !open && setGradingTarget(null)}
        title={t("dialogTitle")}
        description={t("dialogSubtitle")}
      >
        {gradingTarget && (
          <form onSubmit={submitGrade} className="flex flex-col gap-3">
            {error && <Alert variant="error">{error}</Alert>}
            <ul className="flex flex-col gap-3">
              {gradingTarget.answers.map((answer) => {
                const question = questionById.get(answer.questionId);
                if (!question) return null;
                const selected = new Set(answer.selectedOptionIds);
                return (
                  <li key={answer.questionId} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium text-foreground">{question.prompt.en || question.prompt.ar}</p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {question.options.map((option) => (
                        <li key={option.id} className="flex items-center gap-2">
                          <Badge variant={selected.has(option.id) ? "info" : "neutral"}>
                            {selected.has(option.id) ? t("selected") : ""}
                          </Badge>
                          <span
                            className={question.correctOptionIds.includes(option.id) ? "font-medium text-success" : ""}
                          >
                            {option.text.en || option.text.ar}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
            <Input
              type="number"
              min={0}
              max={100}
              label={t("fields.score")}
              value={scoreInput}
              onChange={(event) => setScoreInput(event.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setGradingTarget(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" loading={pending}>
                {t("submitGrade")}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  );
}
