"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Button, Dialog, EmptyState, Input, Pagination, Select, Table } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import type { EducationStageDoc, EducationStageCategory } from "@/lib/server/repositories/educationStageRepository";
import type { SubjectDoc } from "@/lib/server/repositories/subjectRepository";

interface CenterConfigManagerProps {
  initialStages: EducationStageDoc[];
  initialSubjects: SubjectDoc[];
}

const PAGE_SIZE = 10;

interface StageFormState {
  id?: string;
  nameEn: string;
  nameAr: string;
  category: EducationStageCategory;
  order: string;
}

interface SubjectFormState {
  id?: string;
  nameEn: string;
  nameAr: string;
}

const EMPTY_STAGE_FORM: StageFormState = { nameEn: "", nameAr: "", category: "primary", order: "0" };
const EMPTY_SUBJECT_FORM: SubjectFormState = { nameEn: "", nameAr: "" };

/**
 * TASK-1905 — CRUD UI for `educationStages`/`subjects`. Two independent
 * lists side by side rather than a tab component: both are short,
 * flat, admin-only lookup tables, so there's no navigation cost to
 * showing them together on one page (`architecture/folder-structure.md`
 * has them under a single `admin/education` route).
 */
export function CenterConfigManager({ initialStages, initialSubjects }: CenterConfigManagerProps) {
  const t = useTranslations("adminDashboard.education");
  const tCommon = useTranslations("common");

  const [stages, setStages] = React.useState(initialStages);
  const [subjects, setSubjects] = React.useState(initialSubjects);
  const [error, setError] = React.useState<string | null>(null);

  const [stageDialogOpen, setStageDialogOpen] = React.useState(false);
  const [stageForm, setStageForm] = React.useState<StageFormState>(EMPTY_STAGE_FORM);
  const [stagePending, setStagePending] = React.useState(false);
  const [stageDeleteTarget, setStageDeleteTarget] = React.useState<EducationStageDoc | null>(null);

  const [subjectDialogOpen, setSubjectDialogOpen] = React.useState(false);
  const [subjectForm, setSubjectForm] = React.useState<SubjectFormState>(EMPTY_SUBJECT_FORM);
  const [subjectPending, setSubjectPending] = React.useState(false);
  const [subjectDeleteTarget, setSubjectDeleteTarget] = React.useState<SubjectDoc | null>(null);

  const [stagePage, setStagePage] = React.useState(1);
  const stageTotalPages = Math.max(1, Math.ceil(stages.length / PAGE_SIZE));
  const clampedStagePage = Math.min(stagePage, stageTotalPages);
  const pagedStages = stages.slice((clampedStagePage - 1) * PAGE_SIZE, clampedStagePage * PAGE_SIZE);

  const [subjectPage, setSubjectPage] = React.useState(1);
  const subjectTotalPages = Math.max(1, Math.ceil(subjects.length / PAGE_SIZE));
  const clampedSubjectPage = Math.min(subjectPage, subjectTotalPages);
  const pagedSubjects = subjects.slice((clampedSubjectPage - 1) * PAGE_SIZE, clampedSubjectPage * PAGE_SIZE);

  async function refreshStages() {
    const res = await fetch("/api/admin/education-stages");
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { stages: EducationStageDoc[] };
    setStages(body.stages);
    setStagePage(1);
  }

  async function refreshSubjects() {
    const res = await fetch("/api/admin/subjects");
    if (!res.ok) throw new Error("refresh");
    const body = (await res.json()) as { subjects: SubjectDoc[] };
    setSubjects(body.subjects);
    setSubjectPage(1);
  }

  function openCreateStage() {
    setStageForm(EMPTY_STAGE_FORM);
    setError(null);
    setStageDialogOpen(true);
  }

  function openEditStage(stage: EducationStageDoc) {
    setStageForm({
      id: stage.id,
      nameEn: stage.name.en,
      nameAr: stage.name.ar,
      category: stage.category,
      order: String(stage.order),
    });
    setError(null);
    setStageDialogOpen(true);
  }

  async function onStageSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStagePending(true);
    try {
      const body = {
        name: { en: stageForm.nameEn, ar: stageForm.nameAr },
        category: stageForm.category,
        order: Number(stageForm.order),
      };
      const res = await fetch(
        stageForm.id ? `/api/admin/education-stages/${stageForm.id}` : "/api/admin/education-stages",
        {
          method: stageForm.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        setError(t("errors.save"));
        return;
      }
      await refreshStages();
      setStageDialogOpen(false);
      setStageForm(EMPTY_STAGE_FORM);
    } catch {
      setError(t("errors.save"));
    } finally {
      setStagePending(false);
    }
  }

  async function confirmDeleteStage() {
    if (!stageDeleteTarget) return;
    setError(null);
    setStagePending(true);
    try {
      const res = await fetch(`/api/admin/education-stages/${stageDeleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      await refreshStages();
      setStageDeleteTarget(null);
    } catch {
      setError(t("errors.delete"));
    } finally {
      setStagePending(false);
    }
  }

  function openCreateSubject() {
    setSubjectForm(EMPTY_SUBJECT_FORM);
    setError(null);
    setSubjectDialogOpen(true);
  }

  function openEditSubject(subject: SubjectDoc) {
    setSubjectForm({ id: subject.id, nameEn: subject.name.en, nameAr: subject.name.ar });
    setError(null);
    setSubjectDialogOpen(true);
  }

  async function onSubjectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubjectPending(true);
    try {
      const body = { name: { en: subjectForm.nameEn, ar: subjectForm.nameAr } };
      const res = await fetch(subjectForm.id ? `/api/admin/subjects/${subjectForm.id}` : "/api/admin/subjects", {
        method: subjectForm.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(t("errors.save"));
        return;
      }
      await refreshSubjects();
      setSubjectDialogOpen(false);
      setSubjectForm(EMPTY_SUBJECT_FORM);
    } catch {
      setError(t("errors.save"));
    } finally {
      setSubjectPending(false);
    }
  }

  async function confirmDeleteSubject() {
    if (!subjectDeleteTarget) return;
    setError(null);
    setSubjectPending(true);
    try {
      const res = await fetch(`/api/admin/subjects/${subjectDeleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      await refreshSubjects();
      setSubjectDeleteTarget(null);
    } catch {
      setError(t("errors.delete"));
    } finally {
      setSubjectPending(false);
    }
  }

  const stageColumns: Column<EducationStageDoc>[] = [
    { key: "order", header: t("stages.columns.order") },
    { key: "name", header: t("stages.columns.name"), render: (stage) => stage.name.en || stage.name.ar },
    { key: "category", header: t("stages.columns.category"), render: (stage) => t(`stages.category.${stage.category}`) },
  ];

  const subjectColumns: Column<SubjectDoc>[] = [
    { key: "name", header: t("subjects.columns.name"), render: (subject) => subject.name.en || subject.name.ar },
  ];

  return (
    <div className="flex flex-col gap-8">
      {error && <Alert variant="error">{error}</Alert>}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("stages.title")}</h2>
            <p className="mt-1 text-xs text-foreground/60">{t("stages.subtitle")}</p>
          </div>
          <Button type="button" onClick={openCreateStage}>
            {t("stages.newStage")}
          </Button>
        </div>

        {stages.length === 0 ? (
          <EmptyState title={t("stages.emptyTitle")} description={t("stages.emptyDescription")} actionLabel={t("stages.newStage")} onAction={openCreateStage} />
        ) : (
          <>
            <Table
              columns={stageColumns}
              rows={pagedStages}
              rowKey={(stage) => stage.id}
              actionsLabel={tCommon("actions")}
              rowActions={(stage) => (
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditStage(stage)}>
                    {t("edit")}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setStageDeleteTarget(stage)}>
                    {t("delete")}
                  </Button>
                </div>
              )}
            />
            {stageTotalPages > 1 && (
              <Pagination page={clampedStagePage} totalPages={stageTotalPages} onPageChange={setStagePage} />
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("subjects.title")}</h2>
            <p className="mt-1 text-xs text-foreground/60">{t("subjects.subtitle")}</p>
          </div>
          <Button type="button" onClick={openCreateSubject}>
            {t("subjects.newSubject")}
          </Button>
        </div>

        {subjects.length === 0 ? (
          <EmptyState title={t("subjects.emptyTitle")} description={t("subjects.emptyDescription")} actionLabel={t("subjects.newSubject")} onAction={openCreateSubject} />
        ) : (
          <>
            <Table
              columns={subjectColumns}
              rows={pagedSubjects}
              rowKey={(subject) => subject.id}
              actionsLabel={tCommon("actions")}
              rowActions={(subject) => (
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditSubject(subject)}>
                    {t("edit")}
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setSubjectDeleteTarget(subject)}>
                    {t("delete")}
                  </Button>
                </div>
              )}
            />
            {subjectTotalPages > 1 && (
              <Pagination page={clampedSubjectPage} totalPages={subjectTotalPages} onPageChange={setSubjectPage} />
            )}
          </>
        )}
      </section>

      <Dialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        title={stageForm.id ? t("stages.editTitle") : t("stages.createTitle")}
        description={t("stages.formSubtitle")}
      >
        <form onSubmit={onStageSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("stages.fields.nameEn")}
              value={stageForm.nameEn}
              onChange={(event) => setStageForm((current) => ({ ...current, nameEn: event.target.value }))}
              required
            />
            <Input
              label={t("stages.fields.nameAr")}
              value={stageForm.nameAr}
              onChange={(event) => setStageForm((current) => ({ ...current, nameAr: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={t("stages.fields.category")}
              options={[
                { value: "nursery", label: t("stages.category.nursery") },
                { value: "primary", label: t("stages.category.primary") },
                { value: "prep", label: t("stages.category.prep") },
                { value: "secondary", label: t("stages.category.secondary") },
              ]}
              value={stageForm.category}
              onChange={(event) =>
                setStageForm((current) => ({ ...current, category: event.target.value as EducationStageCategory }))
              }
            />
            <Input
              label={t("stages.fields.order")}
              type="number"
              min={0}
              value={stageForm.order}
              onChange={(event) => setStageForm((current) => ({ ...current, order: event.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setStageDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={stagePending}>
              {stageForm.id ? t("save") : t("create")}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!stageDeleteTarget}
        onOpenChange={(open) => !open && setStageDeleteTarget(null)}
        title={t("stages.deleteConfirmTitle")}
        description={t("stages.deleteConfirmDescription")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setStageDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" loading={stagePending} onClick={confirmDeleteStage}>
              {t("confirmDelete")}
            </Button>
          </>
        }
      />

      <Dialog
        open={subjectDialogOpen}
        onOpenChange={setSubjectDialogOpen}
        title={subjectForm.id ? t("subjects.editTitle") : t("subjects.createTitle")}
        description={t("subjects.formSubtitle")}
      >
        <form onSubmit={onSubjectSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("subjects.fields.nameEn")}
              value={subjectForm.nameEn}
              onChange={(event) => setSubjectForm((current) => ({ ...current, nameEn: event.target.value }))}
              required
            />
            <Input
              label={t("subjects.fields.nameAr")}
              value={subjectForm.nameAr}
              onChange={(event) => setSubjectForm((current) => ({ ...current, nameAr: event.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setSubjectDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={subjectPending}>
              {subjectForm.id ? t("save") : t("create")}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!subjectDeleteTarget}
        onOpenChange={(open) => !open && setSubjectDeleteTarget(null)}
        title={t("subjects.deleteConfirmTitle")}
        description={t("subjects.deleteConfirmDescription")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setSubjectDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" loading={subjectPending} onClick={confirmDeleteSubject}>
              {t("confirmDelete")}
            </Button>
          </>
        }
      />
    </div>
  );
}
