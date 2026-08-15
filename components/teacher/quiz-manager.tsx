"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Badge, Button, Dialog, EmptyState, Input, Switch } from "@/components/ui";
import type { QuizDoc } from "@/lib/server/repositories/quizRepository";

interface QuizManagerProps {
  courseId: string;
  initialQuizzes: QuizDoc[];
}

interface FormState {
  id?: string;
  titleEn: string;
  titleAr: string;
}

const EMPTY_FORM: FormState = { titleEn: "", titleAr: "" };

function toFormState(quiz: QuizDoc): FormState {
  return { id: quiz.id, titleEn: quiz.title.en, titleAr: quiz.title.ar };
}

/**
 * TASK-1203: quiz builder UI (list of a course's quizzes). Question
 * management for a given quiz lives on its own page — see
 * `QuestionManager` — reached via each quiz's "manage" link, same
 * split as `LessonManager` (course-level) vs a lesson's own fields.
 */
export function QuizManager({ courseId, initialQuizzes }: QuizManagerProps) {
  const t = useTranslations("teacherDashboard.quizzes");
  const locale = useLocale();
  const [quizzes, setQuizzes] = React.useState(initialQuizzes);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<QuizDoc | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateDialog() {
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(quiz: QuizDoc) {
    setForm(toFormState(quiz));
    setError(null);
    setDialogOpen(true);
  }

  async function refresh() {
    const res = await fetch(`/api/courses/${courseId}/quizzes`);
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { quizzes: QuizDoc[] };
    setQuizzes(body.quizzes);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("save");
    try {
      const res = await fetch(form.id ? `/api/quizzes/${form.id}` : `/api/courses/${courseId}/quizzes`, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: { en: form.titleEn, ar: form.titleAr } }),
      });
      if (!res.ok) {
        setError(t("errors.save"));
        return;
      }
      await refresh();
      setDialogOpen(false);
      setForm(EMPTY_FORM);
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
      const res = await fetch(`/api/quizzes/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      await refresh();
      setDeleteTarget(null);
    } catch {
      setError(t("errors.delete"));
    } finally {
      setPendingAction(null);
    }
  }

  async function togglePublish(quiz: QuizDoc) {
    setError(null);
    setPendingAction(`status-${quiz.id}`);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: quiz.status === "published" ? "draft" : "published" }),
      });
      if (!res.ok) {
        setError(t("errors.publish"));
        return;
      }
      await refresh();
    } catch {
      setError(t("errors.publish"));
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
          {t("newQuiz")}
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} actionLabel={t("newQuiz")} onAction={openCreateDialog} />
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t("title")}>
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 text-start sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{quiz.title.en || quiz.title.ar}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={quiz.status === "published" ? "success" : "neutral"}>
                    {t(`status.${quiz.status}`)}
                  </Badge>
                  <span className="text-xs text-foreground/60">{t("questionCount", { count: quiz.questionIds.length })}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  checked={quiz.status === "published"}
                  onCheckedChange={() => togglePublish(quiz)}
                  disabled={pendingAction === `status-${quiz.id}`}
                  label={t("published")}
                />
                <Link href={`/${locale}/teacher/quizzes/${quiz.id}`}>
                  <Button type="button" variant="outline" size="sm">
                    {t("manageQuestions")}
                  </Button>
                </Link>
                <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(quiz)}>
                  {t("edit")}
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget(quiz)}>
                  {t("delete")}
                </Button>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("fields.titleEn")}
              value={form.titleEn}
              onChange={(event) => updateField("titleEn", event.target.value)}
              required
            />
            <Input
              label={t("fields.titleAr")}
              value={form.titleAr}
              onChange={(event) => updateField("titleAr", event.target.value)}
              required
            />
          </div>
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
