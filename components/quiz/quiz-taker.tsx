"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Badge, Button, Card, CardContent, Checkbox, Radio } from "@/components/ui";
import type { PublicQuestionDoc } from "@/lib/server/repositories/questionRepository";
import type { QuizAttemptDoc } from "@/lib/server/repositories/quizAttemptRepository";

interface QuizTakerProps {
  quizId: string;
  questions: PublicQuestionDoc[];
  initialAttempts: QuizAttemptDoc[];
  /**
   * TASK-3106 — "preview" is the owning teacher/Admin trying out their
   * own (possibly still-`draft`) quiz. Renders identically to "live"
   * (the default, real student flow) except it posts to
   * `/api/quizzes/[quizId]/preview` instead of `/attempts` — scored
   * the same way, but never persisted as a `quizAttempts` document —
   * and skips the "previous attempts" history strip, since a preview
   * run has none.
   */
  mode?: "live" | "preview";
}

type AnswerMap = Record<string, string[]>;

function emptyAnswers(questions: PublicQuestionDoc[]): AnswerMap {
  return Object.fromEntries(questions.map((question) => [question.id, [] as string[]]));
}

function scoreVariant(score: number): "success" | "warning" | "error" {
  if (score >= 70) return "success";
  if (score >= 40) return "warning";
  return "error";
}

/**
 * TASK-1204 — quiz-taking UI (student) & results view. `questions` and
 * `initialAttempts` are fetched server-side by the page
 * (`quizService.listQuestionsForStudent` / `quizAttemptService.listMyAttempts`,
 * both already enrollment/role-gated before this component ever
 * renders), so this component only ever talks to
 * `POST /api/quizzes/[quizId]/attempts` — never a raw question-list
 * fetch — keeping `correctOptionIds` off the client entirely, per
 * `docs/features/quizzes.md`.
 *
 * A `true_false` question is single-select (`Radio`); `multiple_choice`
 * allows more than one correct option (see `questionManager`'s
 * `toggleCorrect`), so it's rendered as a `Checkbox` group — the
 * student can select any number of options, exactly matching what
 * `quizAttemptService.isAnswerCorrect`'s set-equality grading expects.
 */
export function QuizTaker({ quizId, questions, initialAttempts, mode = "live" }: QuizTakerProps) {
  const t = useTranslations("studentQuiz");
  const locale = useLocale();
  const isPreview = mode === "preview";

  const [answers, setAnswers] = React.useState<AnswerMap>(() => emptyAnswers(questions));
  const [attempts, setAttempts] = React.useState(initialAttempts);
  const [result, setResult] = React.useState<QuizAttemptDoc | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [retaking, setRetaking] = React.useState(initialAttempts.length === 0);

  const localizedText = React.useCallback(
    (value: { en: string; ar: string }) => (locale === "ar" ? value.ar : value.en) || value.en || value.ar,
    [locale],
  );

  function selectSingle(questionId: string, optionId: string) {
    setAnswers((current) => ({ ...current, [questionId]: [optionId] }));
  }

  function toggleMulti(questionId: string, optionId: string) {
    setAnswers((current) => {
      const selected = current[questionId] ?? [];
      const next = selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId];
      return { ...current, [questionId]: next };
    });
  }

  function startRetake() {
    setAnswers(emptyAnswers(questions));
    setResult(null);
    setError(null);
    setRetaking(true);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const unanswered = questions.filter((question) => (answers[question.id] ?? []).length === 0);
    if (unanswered.length > 0) {
      setError(t("errors.incomplete"));
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isPreview ? `/api/quizzes/${quizId}/preview` : `/api/quizzes/${quizId}/attempts`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: questions.map((question) => ({
            questionId: question.id,
            selectedOptionIds: answers[question.id] ?? [],
          })),
        }),
      });
      if (!res.ok) {
        setError(t("errors.submit"));
        return;
      }
      if (isPreview) {
        // TASK-3106 — the preview endpoint returns an ephemeral
        // `{ result }` (never persisted, no `id`), not a `QuizAttemptDoc`
        // — synthesize just enough of that shape (score) for the
        // existing result card to render, without adding it to
        // `attempts` (there is no history for a preview run).
        const body = (await res.json()) as { result: { score: number } };
        setResult({ id: "preview", score: body.result.score } as QuizAttemptDoc);
        setRetaking(false);
      } else {
        const body = (await res.json()) as { attempt: QuizAttemptDoc };
        setResult(body.attempt);
        setAttempts((current) => [body.attempt, ...current]);
        setRetaking(false);
      }
    } catch {
      setError(t("errors.submit"));
    } finally {
      setSubmitting(false);
    }
  }

  const latestAttempt = result ?? attempts[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {error && <Alert variant="error">{error}</Alert>}

      {latestAttempt && !retaking && (
        <Card className="flex flex-col gap-3">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={scoreVariant(latestAttempt.score)}>
                {t("scoreBadge", { score: latestAttempt.score })}
              </Badge>
              <p className="text-sm text-foreground/60">{t("resultSubtitle")}</p>
            </div>

            {!isPreview && attempts.length > 1 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-foreground/70">{t("previousAttempts")}</p>
                <ul className="flex flex-wrap gap-2">
                  {attempts.slice(1).map((attempt) => (
                    <li key={attempt.id}>
                      <Badge variant={scoreVariant(attempt.score)}>{t("scoreBadge", { score: attempt.score })}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button type="button" onClick={startRetake} className="self-start">
              {t("retake")}
            </Button>
          </CardContent>
        </Card>
      )}

      {retaking && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {questions.map((question, index) => {
            const selected = answers[question.id] ?? [];
            return (
              <Card key={question.id} className="flex flex-col gap-3">
                <CardContent className="flex flex-col gap-3">
                  <p className="font-medium text-foreground">
                    {index + 1}. {localizedText(question.prompt)}
                  </p>
                  <div className="flex flex-col gap-2">
                    {question.options.map((option) =>
                      question.type === "true_false" ? (
                        <Radio
                          key={option.id}
                          name={question.id}
                          label={localizedText(option.text)}
                          checked={selected.includes(option.id)}
                          onChange={() => selectSingle(question.id, option.id)}
                        />
                      ) : (
                        <Checkbox
                          key={option.id}
                          label={localizedText(option.text)}
                          checked={selected.includes(option.id)}
                          onChange={() => toggleMulti(question.id, option.id)}
                        />
                      ),
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Button type="submit" loading={submitting} className="self-start">
            {t("submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
