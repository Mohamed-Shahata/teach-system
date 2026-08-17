"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Dialog, Spinner } from "@/components/ui";
import { uploadLessonFile } from "@/lib/client/upload";
import { formatBytes } from "@/lib/utils/format-bytes";
import type { FileDoc } from "@/lib/server/repositories/fileRepository";

interface LessonFileManagerProps {
  lessonId: string;
}

const MAX_LESSON_FILE_BYTES = 20 * 1024 * 1024;

/**
 * Per-lesson file uploader + list — TASK-1303. Signs + uploads directly
 * to Cloudinary (`uploadLessonFile`, TASK-1301's `lesson-file` target),
 * then persists metadata via `POST /api/files` (TASK-1302). Deletion
 * calls `DELETE /api/files/[fileId]`, which cascades the Cloudinary
 * asset before removing the Firestore doc.
 */
export function LessonFileManager({ lessonId }: LessonFileManagerProps) {
  const t = useTranslations("teacherDashboard.lessons.files");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<FileDoc[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<FileDoc | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/files?lessonId=${lessonId}`);
    if (!res.ok) throw new Error("load-failed");
    const body = (await res.json()) as { files: FileDoc[] };
    setFiles(body.files);
  }, [lessonId]);

  React.useEffect(() => {
    // Fetching this lesson's files from the server on mount is syncing
    // from an external system (Firestore, via /api/files) — the same
    // documented exception to "no setState in effects" used in
    // theme-provider.tsx, not state derived from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => setError(t("errors.load")));
  }, [refresh, t]);

  async function onSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_LESSON_FILE_BYTES) {
      setError(t("errors.tooLarge"));
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadLessonFile({ lessonId, file });
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          fileName: uploaded.fileName,
          fileType: uploaded.fileType,
          fileSize: uploaded.fileSize,
          url: uploaded.secureUrl,
          publicId: uploaded.publicId,
        }),
      });
      if (!res.ok) throw new Error("create-failed");
      await refresh();
    } catch {
      setError(t("errors.upload"));
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/files/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete-failed");
      await refresh();
      setDeleteTarget(null);
    } catch {
      setError(t("errors.delete"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-foreground/70">{t("title")}</p>
        <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
          {t("upload")}
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={onSelectFile} />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {files === null ? (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-foreground/50">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5" aria-label={t("title")}>
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm"
            >
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-foreground hover:underline"
              >
                {file.fileName}
              </a>
              <span className="shrink-0 text-xs text-foreground/50 tabular-nums">{formatBytes(file.fileSize)}</span>
              <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget(file)}>
                {t("delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

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
            <Button type="button" variant="destructive" loading={deleting} onClick={confirmDelete}>
              {t("confirmDelete")}
            </Button>
          </>
        }
      />
    </div>
  );
}
