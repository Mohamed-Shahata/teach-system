"use client";

import * as React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Alert, Button, Dialog, EmptyState, Input, Table } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import { formatBytes } from "@/lib/utils/format-bytes";
import type { FileDoc } from "@/lib/server/repositories/fileRepository";

export interface TeacherFileRow extends FileDoc {
  courseTitle: string | null;
  lessonTitle: string | null;
}

interface TeacherFilesManagerProps {
  initialFiles: TeacherFileRow[];
}

/**
 * TASK-1304 — the standalone `/teacher/files` page, previously a
 * permanent "coming soon" placeholder (TASK-1303's deliberate scope
 * cut: file management stayed per-lesson only, see
 * docs/tasks/phase-13-file-management.md). This is a read-heavy,
 * cross-course view over the same `files/{fileId}` docs
 * `LessonFileManager` already writes — a client-side text filter over
 * a server-fetched list, plus the same delete flow
 * (`DELETE /api/files/[fileId]`, cascades Cloudinary + the owning
 * lesson's `fileIds`) rather than a second upload entry point, since
 * uploading still only makes sense attached to a specific lesson.
 */
export function TeacherFilesManager({ initialFiles }: TeacherFilesManagerProps) {
  const t = useTranslations("teacherDashboard.files");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const [files, setFiles] = React.useState<TeacherFileRow[]>(initialFiles);
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<TeacherFileRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return files;
    return files.filter((file) => {
      return (
        file.fileName.toLowerCase().includes(query) ||
        (file.courseTitle?.toLowerCase().includes(query) ?? false) ||
        (file.lessonTitle?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [files, search]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/files/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete-failed");
      setFiles((current) => current.filter((file) => file.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError(t("errors.delete"));
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<TeacherFileRow>[] = [
    {
      key: "fileName",
      header: t("columns.name"),
      render: (file) => (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          {file.fileName}
        </a>
      ),
    },
    {
      key: "courseTitle",
      header: t("columns.course"),
      render: (file) => file.courseTitle ?? t("columns.unattached"),
    },
    {
      key: "lessonTitle",
      header: t("columns.lesson"),
      render: (file) => file.lessonTitle ?? "—",
    },
    {
      key: "fileSize",
      header: t("columns.size"),
      numeric: true,
      render: (file) => formatBytes(file.fileSize),
    },
    {
      key: "createdAt",
      header: t("columns.uploaded"),
      render: (file) => format.dateTime(new Date(file.createdAt), { dateStyle: "medium" }),
    },
  ];

  if (files.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : (
        <Table
          columns={columns}
          rows={filtered}
          rowKey={(file) => file.id}
          actionsLabel={tCommon("actions")}
          rowActions={(file) => (
            <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTarget(file)}>
              {t("delete")}
            </Button>
          )}
        />
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
