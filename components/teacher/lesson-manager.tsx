"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button, Dialog, EmptyState, Input, Switch, Textarea } from "@/components/ui";
import { VideoPlayer } from "@/components/lesson/video-player";
import { LessonFileManager } from "@/components/lesson/lesson-file-manager";
import { uploadLessonVideo } from "@/lib/client/upload";
import { cn } from "@/lib/utils/cn";
import type { LessonDoc } from "@/lib/server/repositories/lessonRepository";
import type { VideoProvider } from "@/lib/validation/lesson.schema";

interface LessonManagerProps {
  courseId: string;
  initialLessons: LessonDoc[];
}

/** TASK-2202 — the form's own entry-mode, distinct from the stored `VideoProvider`: "upload" always resolves to `provider: "cloudinary"` once the file lands, but starts out as neither URL. */
type VideoMode = "" | "youtube" | "upload" | "external";

interface FormState {
  id?: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  videoMode: VideoMode;
  videoProvider: VideoProvider | "";
  videoUrl: string;
  videoPublicId: string;
  isFreePreview: boolean;
}

const EMPTY_FORM: FormState = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  videoMode: "",
  videoProvider: "",
  videoUrl: "",
  videoPublicId: "",
  isFreePreview: false,
};

function toFormState(lesson: LessonDoc): FormState {
  const provider = lesson.video?.provider ?? "";
  return {
    id: lesson.id,
    titleEn: lesson.title.en,
    titleAr: lesson.title.ar,
    descriptionEn: lesson.description?.en ?? "",
    descriptionAr: lesson.description?.ar ?? "",
    videoMode: provider === "cloudinary" ? "upload" : provider,
    videoProvider: provider,
    videoUrl: lesson.video?.url ?? "",
    videoPublicId: lesson.video?.publicId ?? "",
    isFreePreview: lesson.isFreePreview,
  };
}

function toRequestBody(form: FormState) {
  return {
    title: { en: form.titleEn, ar: form.titleAr },
    isFreePreview: form.isFreePreview,
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

/** TASK-2203 — 500 MB, generous enough for a full lesson recording while still catching an obviously-wrong file before it ties up the teacher's upload bandwidth. */
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

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
  const [filesOpenId, setFilesOpenId] = React.useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = React.useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = React.useState(0);
  const [videoError, setVideoError] = React.useState<string | null>(null);
  const [isDraggingVideo, setIsDraggingVideo] = React.useState(false);
  const videoFileInputRef = React.useRef<HTMLInputElement>(null);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setVideoMode(mode: VideoMode) {
    setVideoError(null);
    setForm((current) => ({
      ...current,
      videoMode: mode,
      videoProvider: mode === "upload" ? "cloudinary" : mode === "" ? "" : mode,
      videoUrl: mode === "upload" ? current.videoUrl : "",
      videoPublicId: mode === "upload" ? current.videoPublicId : "",
    }));
  }

  async function processVideoFile(file: File) {
    setVideoError(null);
    if (!form.id) {
      // A standalone-exam-style "stage first, upload after" flow isn't
      // available here — a video always attaches to an existing lesson
      // (same constraint TASK-2201's folder resolution enforces
      // server-side), so uploading is only offered once a lesson exists.
      setVideoError(t("errors.videoUploadNeedsLesson"));
      return;
    }
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setVideoError(t("errors.videoType"));
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoError(t("errors.videoSize"));
      return;
    }

    setUploadingVideo(true);
    setVideoUploadProgress(0);
    try {
      const { secureUrl, publicId } = await uploadLessonVideo({
        lessonId: form.id,
        file,
        onProgress: setVideoUploadProgress,
      });
      setForm((current) => ({
        ...current,
        videoMode: "upload",
        videoProvider: "cloudinary",
        videoUrl: secureUrl,
        videoPublicId: publicId,
      }));
    } catch {
      setVideoError(t("errors.videoUpload"));
    } finally {
      setUploadingVideo(false);
    }
  }

  async function onVideoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await processVideoFile(file);
  }

  function onVideoDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingVideo(true);
  }

  function onVideoDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingVideo(false);
  }

  async function onVideoDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingVideo(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processVideoFile(file);
  }

  function openCreateDialog() {
    setForm(EMPTY_FORM);
    setError(null);
    setVideoError(null);
    setDialogOpen(true);
  }

  function openEditDialog(lesson: LessonDoc) {
    setForm(toFormState(lesson));
    setError(null);
    setVideoError(null);
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
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {lesson.video && <Badge variant="neutral">{t(`videoProvider.${lesson.video.provider}`)}</Badge>}
                    {lesson.isFreePreview && <Badge variant="success">{t("freePreview.badge")}</Badge>}
                  </div>
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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFilesOpenId((current) => (current === lesson.id ? null : lesson.id))}
                  >
                    {filesOpenId === lesson.id ? t("files.hide") : t("files.title")}
                  </Button>
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
              {filesOpenId === lesson.id && <LessonFileManager lessonId={lesson.id} />}
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
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="text-start">
              <p className="text-sm font-medium text-foreground">{t("freePreview.label")}</p>
              <p className="mt-0.5 text-xs text-foreground/60">{t("freePreview.hint")}</p>
            </div>
            <Switch
              checked={form.isFreePreview}
              onCheckedChange={(checked) => updateField("isFreePreview", checked)}
              id="lesson-free-preview"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground text-start">{t("fields.video")}</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("fields.video")}>
              {(["youtube", "upload", "external"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={form.videoMode === mode}
                  onClick={() => setVideoMode(mode)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    form.videoMode === mode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground/70 hover:border-primary/50",
                  )}
                >
                  {t(`videoMode.${mode}`)}
                </button>
              ))}
              {form.videoMode && (
                <button
                  type="button"
                  onClick={() => setVideoMode("")}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-foreground/50 hover:text-foreground"
                >
                  {t("videoMode.none")}
                </button>
              )}
            </div>

            {form.videoMode === "youtube" && (
              <Input
                label={t("fields.videoUrl")}
                type="url"
                value={form.videoUrl}
                onChange={(event) => updateField("videoUrl", event.target.value)}
                required
              />
            )}

            {form.videoMode === "external" && (
              <Input
                label={t("fields.videoUrl")}
                type="url"
                value={form.videoUrl}
                onChange={(event) => updateField("videoUrl", event.target.value)}
                required
              />
            )}

            {form.videoMode === "upload" && (
              <div className="flex flex-col gap-1.5">
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept={ACCEPTED_VIDEO_TYPES.join(",")}
                  className="hidden"
                  onChange={onVideoFileChange}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => videoFileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      videoFileInputRef.current?.click();
                    }
                  }}
                  onDragOver={onVideoDragOver}
                  onDragLeave={onVideoDragLeave}
                  onDrop={onVideoDrop}
                  className={cn(
                    "relative flex h-24 w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors",
                    isDraggingVideo ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/50",
                  )}
                >
                  {form.videoUrl ? (
                    <span className="text-sm font-medium text-foreground">{t("fields.videoUploaded")}</span>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-8 w-8 text-foreground/40" aria-hidden="true">
                        <path
                          d="M12 16V4m0 0-4 4m4-4 4 4M4 16.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">{t("fields.uploadVideo")}</span>
                      <span className="max-w-xs text-xs text-foreground/60">{t("hints.videoDragDrop")}</span>
                    </>
                  )}
                  {uploadingVideo && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/80">
                      <span
                        className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-foreground" role="status">
                        {t("fields.videoUploadProgress", { percent: videoUploadProgress })}
                      </span>
                    </div>
                  )}
                </div>
                {form.videoUrl && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateField("videoUrl", "")}
                    >
                      {t("fields.removeVideo")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {videoError && (
              <p role="alert" className="text-xs text-error text-start">
                {videoError}
              </p>
            )}
            <p className="text-xs text-foreground/60 text-start">{t("hints.video")}</p>
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
