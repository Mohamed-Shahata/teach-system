"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button, Checkbox, Dialog, EmptyState, Input, Select } from "@/components/ui";
import type { QuestionDoc } from "@/lib/server/repositories/questionRepository";
import type { QuestionType } from "@/lib/validation/quiz.schema";

interface QuestionManagerProps {
  quizId: string;
  initialQuestions: QuestionDoc[];
}

interface OptionForm {
  id: string;
  textEn: string;
  textAr: string;
}

interface FormState {
  id?: string;
  type: QuestionType;
  promptEn: string;
  promptAr: string;
  options: OptionForm[];
  correctOptionIds: string[];
}

function emptyOption(id: string): OptionForm {
  return { id, textEn: "", textAr: "" };
}

function emptyForm(): FormState {
  return {
    type: "multiple_choice",
    promptEn: "",
    promptAr: "",
    options: [emptyOption("a"), emptyOption("b")],
    correctOptionIds: [],
  };
}

function toFormState(question: QuestionDoc): FormState {
  return {
    id: question.id,
    type: question.type,
    promptEn: question.prompt.en,
    promptAr: question.prompt.ar,
    options: question.options.map((option) => ({ id: option.id, textEn: option.text.en, textAr: option.text.ar })),
    correctOptionIds: question.correctOptionIds,
  };
}

function toRequestBody(form: FormState) {
  return {
    type: form.type,
    prompt: { en: form.promptEn, ar: form.promptAr },
    options: form.options.map((option) => ({ id: option.id, text: { en: option.textEn, ar: option.textAr } })),
    correctOptionIds: form.correctOptionIds,
  };
}

/**
 * TASK-1203: question builder for a single quiz — reached from
 * `QuizManager`'s "manage questions" link. Reorders via up/down
 * buttons rather than drag-and-drop (unlike `LessonManager`) since
 * a quiz's question order matters far less to the teacher workflow
 * than a course's lesson order; `PATCH /api/quizzes/[quizId]/questions`
 * (full-replace, same contract as lesson reordering) backs it either way.
 */
export function QuestionManager({ quizId, initialQuestions }: QuestionManagerProps) {
  const t = useTranslations("teacherDashboard.quizzes.questions");
  const [questions, setQuestions] = React.useState(initialQuestions);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<QuestionDoc | null>(null);

  function openCreateDialog() {
    setForm(emptyForm());
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(question: QuestionDoc) {
    setForm(toFormState(question));
    setError(null);
    setDialogOpen(true);
  }

  function updateOption(index: number, field: "textEn" | "textAr", value: string) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option, i) => (i === index ? { ...option, [field]: value } : option)),
    }));
  }

  function addOption() {
    setForm((current) => ({
      ...current,
      options: [...current.options, emptyOption(String.fromCharCode(97 + current.options.length))],
    }));
  }

  function removeOption(index: number) {
    setForm((current) => {
      const removed = current.options[index];
      return {
        ...current,
        options: current.options.filter((_, i) => i !== index),
        correctOptionIds: current.correctOptionIds.filter((id) => id !== removed.id),
      };
    });
  }

  function toggleCorrect(optionId: string) {
    setForm((current) => {
      const isTrueFalse = current.type === "true_false";
      const has = current.correctOptionIds.includes(optionId);
      const next = isTrueFalse
        ? [optionId]
        : has
          ? current.correctOptionIds.filter((id) => id !== optionId)
          : [...current.correctOptionIds, optionId];
      return { ...current, correctOptionIds: next };
    });
  }

  async function refresh() {
    const res = await fetch(`/api/quizzes/${quizId}/questions`);
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { questions: QuestionDoc[] };
    setQuestions(body.questions);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (form.correctOptionIds.length === 0) {
      setError(t("errors.correctAnswerRequired"));
      return;
    }
    setPendingAction("save");
    try {
      const res = await fetch(form.id ? `/api/questions/${form.id}` : `/api/quizzes/${quizId}/questions`, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequestBody(form)),
      });
      if (!res.ok) {
        setError(t("errors.save"));
        return;
      }
      await refresh();
      setDialogOpen(false);
    } catch {
      setError(t("errors.save"));
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    setPendingAction("delete");
    try {
      const res = await fetch(`/api/questions/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      await refresh();
      setDeleteTarget(null);
    } catch {
      setError(t("errors.delete"));
    } finally {
      setPendingAction(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    [next[index], next[target]] = [next[target], next[index]];
    setQuestions(next);
    setError(null);
    setPendingAction("reorder");
    try {
      const res = await fetch(`/api/quizzes/${quizId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: next.map((question) => question.id) }),
      });
      if (!res.ok) throw new Error("reorder");
    } catch {
      setError(t("errors.reorder"));
      await refresh();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-1 text-xs text-foreground/60">{t("subtitle")}</p>
        </div>
        <Button type="button" onClick={openCreateDialog}>
          {t("newQuestion")}
        </Button>
      </div>

      {questions.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} actionLabel={t("newQuestion")} onAction={openCreateDialog} />
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t("title")}>
          {questions.map((question, index) => (
            <li key={question.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 text-start">
              <div className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-xs font-medium text-foreground/50 tabular-nums">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{question.prompt.en || question.prompt.ar}</p>
                  <Badge variant="neutral">{t(`type.${question.type}`)}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="outline" size="sm" disabled={index === 0} onClick={() => move(index, -1)}>
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={index === questions.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(question)}>
                    {t("edit")}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget(question)}>
                    {t("delete")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={form.id ? t("editTitle") : t("createTitle")}
        description={t("formSubtitle")}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Select
            label={t("fields.type")}
            options={[
              { value: "multiple_choice", label: t("type.multiple_choice") },
              { value: "true_false", label: t("type.true_false") },
            ]}
            value={form.type}
            onChange={(event) =>
              setForm((current) => {
                const type = event.target.value as QuestionType;
                const options =
                  type === "true_false"
                    ? [current.options[0] ?? emptyOption("a"), current.options[1] ?? emptyOption("b")]
                    : current.options;
                return { ...current, type, options, correctOptionIds: [] };
              })
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("fields.promptEn")}
              value={form.promptEn}
              onChange={(event) => setForm((current) => ({ ...current, promptEn: event.target.value }))}
              required
            />
            <Input
              label={t("fields.promptAr")}
              value={form.promptAr}
              onChange={(event) => setForm((current) => ({ ...current, promptAr: event.target.value }))}
              required
            />
          </div>

          <p className="text-xs font-medium text-foreground/70">{t("fields.options")}</p>
          <div className="flex flex-col gap-2">
            {form.options.map((option, index) => (
              <div key={option.id} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2">
                <Checkbox
                  label={t("correct")}
                  checked={form.correctOptionIds.includes(option.id)}
                  onChange={() => toggleCorrect(option.id)}
                />
                <Input
                  label={t("fields.optionEn")}
                  value={option.textEn}
                  onChange={(event) => updateOption(index, "textEn", event.target.value)}
                  required
                />
                <Input
                  label={t("fields.optionAr")}
                  value={option.textAr}
                  onChange={(event) => updateOption(index, "textAr", event.target.value)}
                  required
                />
                {form.type === "multiple_choice" && form.options.length > 2 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => removeOption(index)}>
                    {t("removeOption")}
                  </Button>
                )}
              </div>
            ))}
          </div>
          {form.type === "multiple_choice" && form.options.length < 8 && (
            <Button type="button" variant="outline" size="sm" onClick={addOption} className="self-start">
              {t("addOption")}
            </Button>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={pendingAction === "save"}>
              {form.id ? t("save") : t("create")}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" loading={pendingAction === "delete"} onClick={confirmDelete}>
              {t("confirmDelete")}
            </Button>
          </>
        }
      />
    </section>
  );
}
