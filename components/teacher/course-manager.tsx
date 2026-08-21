"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  EmptyState,
  Input,
  Select,
  Switch,
  Table,
  Textarea,
} from "@/components/ui";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import type { Column } from "@/components/ui/table";
import type { CourseDoc } from "@/lib/server/repositories/courseRepository";
import type { SubjectDoc } from "@/lib/server/repositories/subjectRepository";
import type { EducationStageDoc } from "@/lib/server/repositories/educationStageRepository";
import { uploadImage } from "@/lib/client/upload";
import { cn } from "@/lib/utils/cn";

const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

interface CourseManagerProps {
  initialCourses: CourseDoc[];
  /** From `centerConfigService.listSubjects` (TASK-1905) — populates the subject `Select`. */
  subjects: SubjectDoc[];
  /** From `centerConfigService.listEducationStages` (TASK-1905) — populates the stage `Select`. */
  stages: EducationStageDoc[];
}

interface FormState {
  id?: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  subjectId: string;
  stageId: string;
  thumbnailUrl: string;
  enrollmentType: "free" | "paid";
  price: string;
  currency: string;
}

const EMPTY_FORM: FormState = {
  titleEn: "",
  titleAr: "",
  descriptionEn: "",
  descriptionAr: "",
  subjectId: "",
  stageId: "",
  thumbnailUrl: "",
  enrollmentType: "paid",
  price: "",
  currency: "EGP",
};

function toFormState(course: CourseDoc): FormState {
  return {
    id: course.id,
    titleEn: course.title.en,
    titleAr: course.title.ar,
    descriptionEn: course.description?.en ?? "",
    descriptionAr: course.description?.ar ?? "",
    subjectId: course.subjectId,
    stageId: course.stageId,
    thumbnailUrl: course.thumbnailUrl ?? "",
    enrollmentType: course.enrollmentType,
    price: course.price !== undefined ? String(course.price) : "",
    currency: course.currency ?? "EGP",
  };
}

function toRequestBody(form: FormState) {
  return {
    subjectId: form.subjectId,
    stageId: form.stageId,
    title: { en: form.titleEn, ar: form.titleAr },
    ...(form.descriptionEn || form.descriptionAr
      ? {
          description: {
            ...(form.descriptionEn ? { en: form.descriptionEn } : {}),
            ...(form.descriptionAr ? { ar: form.descriptionAr } : {}),
          },
        }
      : {}),
    ...(form.thumbnailUrl ? { thumbnailUrl: form.thumbnailUrl } : {}),
    enrollmentType: form.enrollmentType,
    ...(form.enrollmentType === "paid" ? { price: Number(form.price) } : {}),
    currency: form.currency,
  };
}

export function CourseManager({ initialCourses, subjects, stages }: CourseManagerProps) {
  const t = useTranslations("teacherDashboard.courses");
  const locale = useLocale();
  const router = useRouter();
  // A teacher normally has a single assigned subject, so `subjects` here is
  // already narrowed to just that one (see the courses page) -- default the
  // form to it instead of making the teacher pick from a list of one.
  const defaultSubjectId = subjects.length === 1 ? subjects[0].id : "";
  const emptyForm = React.useMemo<FormState>(
    () => ({ ...EMPTY_FORM, subjectId: defaultSubjectId }),
    [defaultSubjectId]
  );
  const subjectName = React.useCallback(
    (subjectId: string) => subjects.find((subject) => subject.id === subjectId)?.name[locale as "en" | "ar"] ?? subjectId,
    [subjects, locale],
  );
  const stageName = React.useCallback(
    (stageId: string) => stages.find((stage) => stage.id === stageId)?.name[locale as "en" | "ar"] ?? stageId,
    [stages, locale],
  );
  const [courses, setCourses] = React.useState(initialCourses);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingAction, setPendingAction] = React.useState<"save" | "delete" | "publish" | null>(null);
  const [pendingCourseId, setPendingCourseId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<CourseDoc | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function processThumbnailFile(file: File) {
    setThumbnailError(null);
    if (!file.type.startsWith("image/")) {
      setThumbnailError(t("errors.thumbnailType"));
      return;
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      setThumbnailError(t("errors.thumbnailSize"));
      return;
    }

    setUploadingThumbnail(true);
    try {
      const { secureUrl } = await uploadImage({ target: "course-thumbnail", courseId: form.id, file });
      updateField("thumbnailUrl", secureUrl);
    } catch {
      setThumbnailError(t("errors.thumbnailUpload"));
    } finally {
      setUploadingThumbnail(false);
    }
  }

  async function onThumbnailFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await processThumbnailFile(file);
  }

  function onThumbnailDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function onThumbnailDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
  }

  async function onThumbnailDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await processThumbnailFile(file);
  }

  function openCreateDialog() {
    setForm(emptyForm);
    setError(null);
    setThumbnailError(null);
    setDialogOpen(true);
  }

  function openEditDialog(course: CourseDoc) {
    setForm(toFormState(course));
    setError(null);
    setThumbnailError(null);
    setDialogOpen(true);
  }

  async function refresh() {
    const res = await fetch("/api/courses");
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { courses: CourseDoc[] };
    setCourses(body.courses);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("save");
    try {
      const res = await fetch(form.id ? `/api/courses/${form.id}` : "/api/courses", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequestBody(form)),
      });
      if (!res.ok) {
        setError(res.status === 409 ? t("errors.slugConflict") : t("errors.save"));
        return;
      }
      await refresh();
      setDialogOpen(false);
      setForm(emptyForm);
    } catch {
      setError(t("errors.save"));
    } finally {
      setPendingAction(null);
    }
  }

  async function togglePublish(course: CourseDoc) {
    setError(null);
    setPendingAction("publish");
    setPendingCourseId(course.id);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: course.status === "published" ? "draft" : "published" }),
      });
      if (!res.ok) throw new Error("publish");
      await refresh();
    } catch {
      setError(t("errors.publish"));
    } finally {
      setPendingAction(null);
      setPendingCourseId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    setPendingAction("delete");
    setPendingCourseId(deleteTarget.id);
    try {
      const res = await fetch(`/api/courses/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      await refresh();
      setDeleteTarget(null);
    } catch {
      setError(t("errors.delete"));
    } finally {
      setPendingAction(null);
      setPendingCourseId(null);
    }
  }

  const columns: Column<CourseDoc>[] = [
    { key: "title", header: t("columns.title"), render: (course) => course.title.en || course.title.ar },
    { key: "subjectId", header: t("columns.subject"), render: (course) => subjectName(course.subjectId) },
    { key: "stageId", header: t("columns.stage"), render: (course) => stageName(course.stageId) },
    {
      key: "status",
      header: t("columns.status"),
      render: (course) => (
        <Badge variant={course.status === "published" ? "success" : "neutral"}>
          {t(`status.${course.status}`)}
        </Badge>
      ),
    },
    {
      key: "enrollmentType",
      header: t("columns.enrollment"),
      render: (course) =>
        course.enrollmentType === "free" ? t("enrollmentType.free") : `${t("enrollmentType.paid")} · ${course.price ?? 0} ${course.currency ?? ""}`,
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-1 text-xs text-foreground/60">{t("subtitle")}</p>
        </div>
        <Button type="button" onClick={openCreateDialog}>
          {t("newCourse")}
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} actionLabel={t("newCourse")} onAction={openCreateDialog} />
      ) : (
        <Table
          columns={columns}
          rows={courses}
          rowKey={(course) => course.id}
          actionsLabel={t("columns.actions")}
          rowActions={(course) => (
            <div className="flex items-center justify-end gap-2">
              <Switch
                checked={course.status === "published"}
                onCheckedChange={() => togglePublish(course)}
                disabled={pendingAction === "publish" && pendingCourseId === course.id}
                label={course.status === "published" ? t("unpublish") : t("publish")}
              />
              <TableActionsMenu
                triggerLabel={t("columns.actions")}
                actions={[
                  {
                    label: t("manageLessons"),
                    onClick: () => router.push(`/${locale}/teacher/courses/${course.id}`),
                  },
                  { label: t("edit"), onClick: () => openEditDialog(course) },
                  { label: t("delete"), variant: "destructive", onClick: () => setDeleteTarget(course) },
                ]}
              />
            </div>
          )}
        />
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={form.id ? t("editTitle") : t("createTitle")}
        description={t("formSubtitle")}
        size="lg"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground text-start">{t("fields.thumbnailUrl")}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onThumbnailFileChange}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={onThumbnailDragOver}
              onDragLeave={onThumbnailDragLeave}
              onDrop={onThumbnailDrop}
              className={cn(
                "relative flex h-24 w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isDraggingOver ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/50"
              )}
            >
              {form.thumbnailUrl ? (
                <>
                  <img src={form.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent p-3">
                    <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground">
                      {t("fields.replaceThumbnail")}
                    </span>
                  </div>
                </>
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
                  <span className="text-sm font-medium text-foreground">{t("fields.uploadThumbnail")}</span>
                  <span className="max-w-xs text-xs text-foreground/60">{t("hints.thumbnailDragDrop")}</span>
                </>
              )}
              {uploadingThumbnail && (
                <div className="absolute inset-0 grid place-items-center bg-background/70">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                </div>
              )}
            </div>
            {form.thumbnailUrl && (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => updateField("thumbnailUrl", "")}>
                  {t("fields.removeThumbnail")}
                </Button>
              </div>
            )}
            {thumbnailError && (
              <p role="alert" className="text-xs text-error text-start">
                {thumbnailError}
              </p>
            )}
          </div>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={t("fields.subjectId")}
              placeholder={t("fields.selectPlaceholder")}
              options={subjects.map((subject) => ({
                value: subject.id,
                label: subject.name[locale as "en" | "ar"] || subject.name.en,
              }))}
              value={form.subjectId}
              onChange={(event) => updateField("subjectId", event.target.value)}
              disabled={subjects.length <= 1}
              required
            />
            <Select
              label={t("fields.stageId")}
              placeholder={t("fields.selectPlaceholder")}
              options={stages.map((stage) => ({
                value: stage.id,
                label: stage.name[locale as "en" | "ar"] || stage.name.en,
              }))}
              value={form.stageId}
              onChange={(event) => updateField("stageId", event.target.value)}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label={t("fields.enrollmentType")}
              options={[
                { value: "paid", label: t("enrollmentType.paid") },
                { value: "free", label: t("enrollmentType.free") },
              ]}
              value={form.enrollmentType}
              onChange={(event) => updateField("enrollmentType", event.target.value as FormState["enrollmentType"])}
            />
            <Input
              label={t("fields.price")}
              type="number"
              min={0}
              step="0.01"
              disabled={form.enrollmentType === "free"}
              value={form.price}
              onChange={(event) => updateField("price", event.target.value)}
              required={form.enrollmentType === "paid"}
            />
            <Input
              label={t("fields.currency")}
              maxLength={3}
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value.toUpperCase())}
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
