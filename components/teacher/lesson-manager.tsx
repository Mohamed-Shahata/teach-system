"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button, Dialog, EmptyState, Input, Select, Textarea } from "@/components/ui";
import { VideoPlayer } from "@/components/lesson/video-player";
import type { LessonDoc } from "@/lib/server/repositories/lessonRepository";
import type { VideoProvider } from "@/lib/validation/lesson.schema";

interface LessonManagerProps {
  courseId: string;
  initialLessons: LessonDoc[];
}

interface FormState {
  id?: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  videoProvider: VideoProvider | "";
  videoUrl: string;
  videoPublicId: string;
}

const EMPTY_FORM: FormState = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  videoProvider: "",
  videoUrl: "",
  videoPublicId: "",
};

function toFormState(lesson: LessonDoc): FormState {
  return {
    id: lesson.id,
    titleEn: lesson.title.en,
    titleAr: lesson.title.ar,
    descriptionEn: lesson.description?.en ?? "",
    descriptionAr: lesson.description?.ar ?? "",
    videoProvider: lesson.video?.provider ?? "",
    videoUrl: lesson.video?.url ?? "",
    videoPublicId: lesson.video?.publicId ?? "",
  };
}

function toRequestBody(form: FormState) {
  return {
    title: { en: form.titleEn, ar: form.titleAr },
    ...(form.descriptionEn || form.descriptionAr
      ? {
          description: {
            ...(form.descriptionEn ? { en: form.descriptionEn } : {}),
            ...(form.descriptionAr ? { ar: form.descriptionAr } : {}),
          },
        }
      : {}),
    ...(form.videoProvider && form.videoUrl
      ? {
          video: {
            provider: form.videoProvider,
            url: form.videoUrl,
            ...(form.videoPublicId ? { publicId: form.videoPublicId } : {}),
          },
        }
      : {}),
  };
}

export function LessonManager({ courseId, initialLessons }: LessonManagerProps) {
  const t = useTranslations("teacherDashboard.lessons");
  const [lessons, setLessons] = React.useState(initialLessons);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<"save" | "delete" | "reorder" | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<LessonDoc | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dragOverId, setDragOverId] = React.useState<string | null>(null);
  const [previewId, setPreviewId] = React.useState<string | null>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateDialog() {
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(lesson: LessonDoc) {
    setForm(toFormState(lesson));
    setError(null);
    setDialogOpen(true);
  }

  async function refresh() {
    const res = await fetch(`/api/courses/${courseId}/lessons`);
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { lessons: LessonDoc[] };
    setLessons(body.lessons);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("save");
    try {
      const res = await fetch(
        form.id ? `/api/lessons/${form.id}` : `/api/courses/${courseId}/lessons`,
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toRequestBody(form)),
        },
      );
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
      const res = await fetch(`/api/lessons/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      await refresh();
      setDeleteTarget(null);
    } catch {
      setError(t("errors.delete"));
    } finally {
      setPendingAction(null);
    }
  }

  async function persistOrder(orderedLessons: LessonDoc[]) {
    setError(null);
    setPendingAction("reorder");
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonIds: orderedLessons.map((lesson) => lesson.id) }),
      });
      if (!res.ok) throw new Error("reorder");
      const body = (await res.json()) as { lessons: LessonDoc[] };
      setLessons(body.lessons);
    } catch {
      setError(t("errors.reorder"));
      await refresh();
    } finally {
      setPendingAction(null);
    }
  }

  function onDrop(targetId: string) {
    setDragOverId(null);
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    const fromIndex = lessons.findIndex((lesson) => lesson.id === dragId);
    const toIndex = lessons.findIndex((lesson) => lesson.id === targetId);
    setDragId(null);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...lessons];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setLessons(next);
    void persistOrder(next);
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
          {t("newLesson")}
        </Button>
      </div>

      {lessons.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} actionLabel={t("newLesson")} onAction={openCreateDialog} />
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t("title")}>
          {lessons.map((lesson, index) => (
            <li
              key={lesson.id}
              draggable
              onDragStart={() => setDragId(lesson.id)}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverId(lesson.id);
              }}
              onDragLeave={() => setDragOverId((current) => (current === lesson.id ? null : current))}
              onDrop={() => onDrop(lesson.id)}
              onDragEnd={() => {
                setDragId(null);
                setDragOverId(null);
              }}
              className={`flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 text-start transition-colors ${
                dragOverId === lesson.id ? "border-primary" : ""
              } ${dragId === lesson.id ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="cursor-grab select-none text-foreground/40 active:cursor-grabbing"
                  aria-hidden="true"
                  title={t("dragHandle")}
                >
                  ⠿
                </span>
                <span className="w-6 shrink-0 text-xs font-medium text-foreground/50 tabular-nums">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{lesson.title.en || lesson.title.ar}</p>
                  {lesson.video && <Badge variant="neutral">{t(`videoProvider.${lesson.video.provider}`)}</Badge>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {lesson.video && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewId((current) => (current === lesson.id ? null : lesson.id))}
                    >
                      {previewId === lesson.id ? t("hidePreview") : t("preview")}
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(lesson)}>
                    {t("edit")}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget(lesson)}>
                    {t("delete")}
                  </Button>
                </div>
              </div>
              {previewId === lesson.id && lesson.video && (
                <VideoPlayer video={lesson.video} title={lesson.title.en || lesson.title.ar} className="max-w-xl" />
              )}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Textarea
              label={t("fields.descriptionEn")}
              value={form.descriptionEn}
              onChange={(event) => updateField("descriptionEn", event.target.value)}
            />
            <Textarea
              label={t("fields.descriptionAr")}
              value={form.descriptionAr}
              onChange={(event) => updateField("descriptionAr", event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label={t("fields.videoProvider")}
              placeholder={t("fields.videoProviderPlaceholder")}
              options={[
                { value: "youtube", label: t("videoProvider.youtube") },
                { value: "cloudinary", label: t("videoProvider.cloudinary") },
                { value: "external", label: t("videoProvider.external") },
              ]}
              value={form.videoProvider}
              onChange={(event) => updateField("videoProvider", event.target.value as VideoProvider)}
            />
            <Input
              label={t("fields.videoUrl")}
              type="url"
              value={form.videoUrl}
              onChange={(event) => updateField("videoUrl", event.target.value)}
              required={!!form.videoProvider}
            />
            <Input
              label={t("fields.videoPublicId")}
              value={form.videoPublicId}
              onChange={(event) => updateField("videoPublicId", event.target.value)}
            />
          </div>
          <p className="text-xs text-foreground/60 text-start">{t("hints.video")}</p>
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
