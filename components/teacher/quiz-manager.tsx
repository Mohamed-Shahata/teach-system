"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Badge, Button, Dialog, EmptyState, Input, Select, Switch } from "@/components/ui";
import { QuizPreview } from "@/components/teacher/quiz-preview";
import type { QuizDoc } from "@/lib/server/repositories/quizRepository";
import type { EducationStageDoc } from "@/lib/server/repositories/educationStageRepository";

interface QuizManagerProps {
  /** Present for a course's quiz list; absent for the standalone-exam builder (TASK-2105) — see the course-less branch below. */
  courseId?: string;
  initialQuizzes: QuizDoc[];
  /** Course-less mode only — the stage picker for a new/edited standalone exam's `stageId`. */
  stages?: EducationStageDoc[];
}

interface FormState {
  id?: string;
  titleEn: string;
  titleAr: string;
  /** Course-less mode only. */
  stageId: string;
  /** Course-less mode only — `datetime-local` string; converted to epoch ms on submit. */
  scheduledAt: string;
}

const EMPTY_FORM: FormState = { titleEn: "", titleAr: "", stageId: "", scheduledAt: "" };

function toDatetimeLocal(epochMs: number): string {
  const date = new Date(epochMs - new Date(epochMs).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function toFormState(quiz: QuizDoc): FormState {
  return {
    id: quiz.id,
    titleEn: quiz.title.en,
    titleAr: quiz.title.ar,
    stageId: quiz.stageId ?? "",
    scheduledAt: quiz.scheduledAt ? toDatetimeLocal(quiz.scheduledAt) : "",
  };
}

/**
 * TASK-1203: quiz builder UI (list of a course's quizzes). Question
 * management for a given quiz lives on its own page — see
 * `QuestionManager` — reached via each quiz's "manage" link, same
 * split as `LessonManager` (course-level) vs a lesson's own fields.
 *
 * TASK-2105 — reused as-is for the `teacher/exams` standalone-exam
 * builder when `courseId` is absent: the list/create/update endpoints
 * switch to the course-less `/api/quizzes` routes, and the create/edit
 * dialog gains `stageId`/`scheduledAt` fields (required by
 * `createQuizSchema` when `courseId` is absent) instead of relying on a
 * course's own scope. Everything else — publish toggle, delete,
 * "manage questions" link — is identical between the two modes.
 */
export function QuizManager({ courseId, initialQuizzes, stages = [] }: QuizManagerProps) {
  const t = useTranslations("teacherDashboard.quizzes");
  const locale = useLocale();
  const [quizzes, setQuizzes] = React.useState(initialQuizzes);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<QuizDoc | null>(null);

  const listUrl = courseId ? `/api/courses/${courseId}/quizzes` : "/api/quizzes";
  const stageOptions = stages.map((stage) => ({ value: stage.id, label: stage.name.en || stage.name.ar }));

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
    const res = await fetch(listUrl);
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { quizzes: QuizDoc[] };
    setQuizzes(body.quizzes);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("save");
    try {
      const body: Record<string, unknown> = { title: { en: form.titleEn, ar: form.titleAr } };
      if (!courseId) {
        body.stageId = form.stageId;
        body.scheduledAt = new Date(form.scheduledAt).getTime();
      }
      const res = await fetch(form.id ? `/api/quizzes/${form.id}` : listUrl, {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
                <QuizPreview quizId={quiz.id} />
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
          {!courseId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label={t("fields.stage")}
                options={stageOptions}
                placeholder={t("fields.stagePlaceholder")}
                value={form.stageId}
                onChange={(event) => updateField("stageId", event.target.value)}
                required
              />
              <Input
                type="datetime-local"
                label={t("fields.scheduledAt")}
                value={form.scheduledAt}
                onChange={(event) => updateField("scheduledAt", event.target.value)}
                required
              />
            </div>
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
