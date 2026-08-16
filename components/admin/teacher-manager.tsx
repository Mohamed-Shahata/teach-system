"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Badge, Button, Dialog, Input, Pagination, Select, Table } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import type { TeacherSummary } from "@/lib/server/services/teacherManagementService";
import type { SubjectDoc } from "@/lib/server/repositories/subjectRepository";
import type { EducationStageDoc } from "@/lib/server/repositories/educationStageRepository";
import type { TeacherOfferingDoc } from "@/lib/server/repositories/teacherOfferingRepository";

interface TeacherManagerProps {
  initialTeachers: TeacherSummary[];
  subjects: SubjectDoc[];
  stages: EducationStageDoc[];
}

interface CreateTeacherFormState {
  displayName: string;
  email: string;
  phone: string;
  age: string;
  subjectId: string;
}

const EMPTY_CREATE_FORM: CreateTeacherFormState = { displayName: "", email: "", phone: "", age: "", subjectId: "" };

interface EditTeacherFormState {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  subjectId: string;
}

function editFormFromTeacher(teacher: TeacherSummary): EditTeacherFormState {
  return {
    uid: teacher.uid,
    displayName: teacher.displayName,
    email: teacher.email,
    phone: teacher.phone ?? "",
    subjectId: teacher.subjectId ?? "",
  };
}

const PAGE_SIZE = 10;

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-medium text-foreground">
      {children} <span className="text-error">*</span>
    </span>
  );
}

/**
 * TASK-1903 — Admin-facing Teacher list with search, per-teacher stats,
 * a deactivate/reactivate action, account creation (name/email/phone +
 * subjects taught), and a per-teacher monthly-pricing dialog
 * (`teacherOfferings`: subject + grade level -> monthly price).
 */
export function TeacherManager({ initialTeachers, subjects, stages }: TeacherManagerProps) {
  const t = useTranslations("adminDashboard.teachers");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [teachers, setTeachers] = React.useState(initialTeachers);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<TeacherSummary | null>(null);
  const [pending, setPending] = React.useState(false);

  const [permissionsTarget, setPermissionsTarget] = React.useState<TeacherSummary | null>(null);
  const [permissionsPending, setPermissionsPending] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateTeacherFormState>(EMPTY_CREATE_FORM);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const [offeringsTarget, setOfferingsTarget] = React.useState<TeacherSummary | null>(null);

  const [editTarget, setEditTarget] = React.useState<TeacherSummary | null>(null);
  const [editForm, setEditForm] = React.useState<EditTeacherFormState | null>(null);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);

  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(teachers.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pagedTeachers = teachers.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function localizedName(name: { en: string; ar: string }): string {
    return locale === "ar" ? name.ar || name.en : name.en || name.ar;
  }

  async function refresh(nextSearch: string) {
    setLoading(true);
    setError(null);
    try {
      const url = nextSearch ? `/api/admin/teachers?search=${encodeURIComponent(nextSearch)}` : "/api/admin/teachers";
      const res = await fetch(url);
      if (!res.ok) throw new Error("list");
      const body = (await res.json()) as { teachers: TeacherSummary[] };
      setTeachers(body.teachers);
      setPage(1);
    } catch {
      setError(t("errors.list"));
    } finally {
      setLoading(false);
    }
  }

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void refresh(search);
  }

  async function confirmStatusChange() {
    if (!statusTarget) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teachers/${statusTarget.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !statusTarget.disabled }),
      });
      if (!res.ok) throw new Error("update");
      const body = (await res.json()) as { teacher: TeacherSummary };
      setTeachers((current) => current.map((teacher) => (teacher.uid === body.teacher.uid ? body.teacher : teacher)));
      setStatusTarget(null);
    } catch {
      setError(statusTarget.disabled ? t("errors.activate") : t("errors.deactivate"));
    } finally {
      setPending(false);
    }
  }

  async function confirmPermissionsChange() {
    if (!permissionsTarget) return;
    setPermissionsPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teachers/${permissionsTarget.uid}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canCreateStudents: !permissionsTarget.canCreateStudents }),
      });
      if (!res.ok) throw new Error("update");
      const body = (await res.json()) as { teacher: TeacherSummary };
      setTeachers((current) => current.map((teacher) => (teacher.uid === body.teacher.uid ? body.teacher : teacher)));
      setPermissionsTarget(null);
    } catch {
      setError(t("errors.permissions"));
    } finally {
      setPermissionsPending(false);
    }
  }

  function selectCreateSubject(subjectId: string) {
    setCreateForm((current) => ({ ...current, subjectId }));
  }

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "teacher",
          displayName: createForm.displayName,
          email: createForm.email,
          phone: createForm.phone,
          ...(createForm.age ? { age: Number(createForm.age) } : {}),
          ...(createForm.subjectId ? { subjectId: createForm.subjectId } : {}),
        }),
      });
      if (!res.ok) throw new Error("create");
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      await refresh(search);
    } catch {
      setCreateError(t("errors.create"));
    } finally {
      setCreating(false);
    }
  }

  function openEdit(teacher: TeacherSummary) {
    setEditTarget(teacher);
    setEditForm(editFormFromTeacher(teacher));
    setEditError(null);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget || !editForm) return;
    setEditing(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/teachers/${editTarget.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: editForm.displayName,
          email: editForm.email,
          phone: editForm.phone,
          ...(editForm.subjectId ? { subjectId: editForm.subjectId } : {}),
        }),
      });
      if (!res.ok) throw new Error("update");
      const body = (await res.json()) as { teacher: TeacherSummary };
      setTeachers((current) => current.map((teacher) => (teacher.uid === body.teacher.uid ? body.teacher : teacher)));
      setEditTarget(null);
      setEditForm(null);
    } catch {
      setEditError(t("errors.edit"));
    } finally {
      setEditing(false);
    }
  }

  function subjectLabel(subjectId?: string): string {
    if (!subjectId) return "—";
    const subject = subjects.find((s) => s.id === subjectId);
    return subject ? localizedName(subject.name) : "—";
  }

  const columns: Column<TeacherSummary>[] = [
    { key: "displayName", header: t("columns.name") },
    { key: "email", header: t("columns.email") },
    { key: "subject", header: t("columns.subject"), render: (row) => subjectLabel(row.subjectId) },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) =>
        row.disabled ? (
          <Badge variant="error">{t("status.deactivated")}</Badge>
        ) : (
          <Badge variant="success">{t("status.active")}</Badge>
        ),
    },
    {
      key: "permissions",
      header: t("columns.permissions"),
      render: (row) =>
        row.canCreateStudents ? (
          <Badge variant="success">{t("permissions.canCreateStudents")}</Badge>
        ) : (
          <Badge variant="error">{t("permissions.disable")}</Badge>
        ),
    },
    { key: "courses", header: t("columns.courses"), numeric: true, render: (row) => row.stats.totalCourses },
    { key: "students", header: t("columns.students"), numeric: true, render: (row) => row.stats.totalStudents },
    {
      key: "enrollments",
      header: t("columns.enrollments"),
      numeric: true,
      render: (row) => row.stats.totalEnrollments,
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <form onSubmit={onSearchSubmit} className="flex max-w-sm gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />
          <Button type="submit" variant="outline" loading={loading}>
            {t("search")}
          </Button>
        </form>

        <Button type="button" onClick={() => setCreateOpen(true)}>
          {t("create")}
        </Button>
      </div>

      <Table
        columns={columns}
        rows={pagedTeachers}
        rowKey={(row) => row.uid}
        loading={loading}
        emptyMessage={t("empty")}
        actionsLabel={tCommon("actions")}
        rowActions={(row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => openEdit(row)}>
              {t("edit")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOfferingsTarget(row)}>
              {t("offerings")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={row.canCreateStudents ? "destructive" : "outline"}
              onClick={() => setPermissionsTarget(row)}
            >
              {row.canCreateStudents ? t("permissions.disable") : t("permissions.enable")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={row.disabled ? "outline" : "destructive"}
              onClick={() => setStatusTarget(row)}
            >
              {row.disabled ? t("activate") : t("deactivate")}
            </Button>
          </div>
        )}
      />

      {totalPages > 1 && <Pagination page={clampedPage} totalPages={totalPages} onPageChange={setPage} />}

      <Dialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.disabled ? t("activateConfirmTitle") : t("deactivateConfirmTitle")}
        description={statusTarget?.disabled ? t("activateConfirmDescription") : t("deactivateConfirmDescription")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setStatusTarget(null)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant={statusTarget?.disabled ? "primary" : "destructive"}
              loading={pending}
              onClick={confirmStatusChange}
            >
              {statusTarget?.disabled ? t("activate") : t("deactivate")}
            </Button>
          </>
        }
      />

      <Dialog
        open={permissionsTarget !== null}
        onOpenChange={(open) => !open && setPermissionsTarget(null)}
        title={permissionsTarget?.canCreateStudents ? t("permissions.disableConfirmTitle") : t("permissions.enableConfirmTitle")}
        description={
          permissionsTarget?.canCreateStudents
            ? t("permissions.disableConfirmDescription")
            : t("permissions.enableConfirmDescription")
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPermissionsTarget(null)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant={permissionsTarget?.canCreateStudents ? "destructive" : "primary"}
              loading={permissionsPending}
              onClick={confirmPermissionsChange}
            >
              {permissionsTarget?.canCreateStudents ? t("permissions.disable") : t("permissions.enable")}
            </Button>
          </>
        }
      />

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateForm(EMPTY_CREATE_FORM);
            setCreateError(null);
          }
        }}
        title={t("createTitle")}
        description={t("createDescription")}
        size="lg"
      >
        <form onSubmit={submitCreate} className="flex flex-col gap-4">
          {createError && <Alert variant="error">{createError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <RequiredLabel>{t("fields.displayName")}</RequiredLabel>
              <Input
                required
                value={createForm.displayName}
                onChange={(event) => setCreateForm((c) => ({ ...c, displayName: event.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <RequiredLabel>{t("fields.email")}</RequiredLabel>
              <Input
                type="email"
                required
                value={createForm.email}
                onChange={(event) => setCreateForm((c) => ({ ...c, email: event.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <RequiredLabel>{t("fields.phone")}</RequiredLabel>
              <Input
                type="tel"
                required
                value={createForm.phone}
                onChange={(event) => setCreateForm((c) => ({ ...c, phone: event.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">{t("fields.age")}</span>
              <Input
                type="number"
                min={18}
                max={80}
                value={createForm.age}
                onChange={(event) => setCreateForm((c) => ({ ...c, age: event.target.value }))}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("fields.subjects")}</span>
            <Select
              value={createForm.subjectId}
              onChange={(event) => selectCreateSubject(event.target.value)}
              placeholder={t("fields.selectSubject")}
              options={subjects.map((subject) => ({ value: subject.id, label: localizedName(subject.name) }))}
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={creating}>
              {t("submit")}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            setEditForm(null);
            setEditError(null);
          }
        }}
        title={t("editTitle")}
        description={t("editDescription")}
        size="lg"
      >
        {editForm && (
          <form onSubmit={submitEdit} className="flex flex-col gap-4">
            {editError && <Alert variant="error">{editError}</Alert>}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <RequiredLabel>{t("fields.displayName")}</RequiredLabel>
                <Input
                  required
                  value={editForm.displayName}
                  onChange={(event) => setEditForm((c) => (c ? { ...c, displayName: event.target.value } : c))}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <RequiredLabel>{t("fields.email")}</RequiredLabel>
                <Input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(event) => setEditForm((c) => (c ? { ...c, email: event.target.value } : c))}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                <RequiredLabel>{t("fields.phone")}</RequiredLabel>
                <Input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(event) => setEditForm((c) => (c ? { ...c, phone: event.target.value } : c))}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">{t("fields.subjects")}</span>
              <Select
                value={editForm.subjectId}
                onChange={(event) => setEditForm((c) => (c ? { ...c, subjectId: event.target.value } : c))}
                placeholder={t("fields.selectSubject")}
                options={subjects.map((subject) => ({ value: subject.id, label: localizedName(subject.name) }))}
              />
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" loading={editing}>
                {t("save")}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {offeringsTarget && (
        <TeacherOfferingsDialog
          teacher={offeringsTarget}
          subjects={subjects}
          stages={stages}
          localizedName={localizedName}
          onClose={() => setOfferingsTarget(null)}
        />
      )}
    </section>
  );
}

interface TeacherOfferingsDialogProps {
  teacher: TeacherSummary;
  subjects: SubjectDoc[];
  stages: EducationStageDoc[];
  localizedName: (name: { en: string; ar: string }) => string;
  onClose: () => void;
}

/**
 * Per-teacher monthly pricing: add/remove a (subject, stage) -> price
 * row. Opened from the teacher's row action in `TeacherManager`.
 */
function TeacherOfferingsDialog({ teacher, subjects, stages, localizedName, onClose }: TeacherOfferingsDialogProps) {
  const t = useTranslations("adminDashboard.teachers");

  const [offerings, setOfferings] = React.useState<TeacherOfferingDoc[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [subjectId, setSubjectId] = React.useState(subjects[0]?.id ?? "");
  const [stageId, setStageId] = React.useState(stages[0]?.id ?? "");
  const [price, setPrice] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/admin/teachers/${teacher.uid}/offerings`)
      .then((res) => {
        if (!res.ok) throw new Error("list");
        return res.json() as Promise<{ offerings: TeacherOfferingDoc[] }>;
      })
      .then((body) => {
        if (!cancelled) setOfferings(body.offerings);
      })
      .catch(() => {
        if (!cancelled) setError(t("errors.offerings"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teacher.uid, t]);

  async function addOffering(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const monthlyPrice = Number(price);
    if (!subjectId || !stageId || !Number.isFinite(monthlyPrice) || monthlyPrice <= 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teachers/${teacher.uid}/offerings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, stageId, monthlyPrice }),
      });
      if (!res.ok) throw new Error("create");
      const body = (await res.json()) as { offering: TeacherOfferingDoc };
      setOfferings((current) => [...current, body.offering]);
      setPrice("");
    } catch {
      setError(t("errors.offerings"));
    } finally {
      setSaving(false);
    }
  }

  async function removeOffering(offeringId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/offerings/${offeringId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      setOfferings((current) => current.filter((o) => o.id !== offeringId));
    } catch {
      setError(t("errors.offerings"));
    }
  }

  function nameFor(list: { id: string; name: { en: string; ar: string } }[], id: string): string {
    const found = list.find((item) => item.id === id);
    return found ? localizedName(found.name) : id;
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("offeringsTitle", { name: teacher.displayName })}
      description={t("offeringsDescription")}
    >
      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={addOffering} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("offeringSubject")}</span>
            <select
              className="h-10 rounded-md border border-border bg-background px-2 text-sm"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {localizedName(subject.name)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("offeringStage")}</span>
            <select
              className="h-10 rounded-md border border-border bg-background px-2 text-sm"
              value={stageId}
              onChange={(event) => setStageId(event.target.value)}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {localizedName(stage.name)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("offeringPrice")}</span>
            <Input
              type="number"
              min={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="w-32"
            />
          </label>

          <Button type="submit" loading={saving}>
            {t("addOffering")}
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-foreground/60">…</p>
        ) : offerings.length === 0 ? (
          <p className="text-sm text-foreground/60">{t("offeringsEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {offerings.map((offering) => (
              <li
                key={offering.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <span>
                  {nameFor(subjects, offering.subjectId)} — {nameFor(stages, offering.stageId)} —{" "}
                  {offering.monthlyPrice} EGP
                </span>
                <Button type="button" size="sm" variant="destructive" onClick={() => removeOffering(offering.id)}>
                  {t("removeOffering")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
