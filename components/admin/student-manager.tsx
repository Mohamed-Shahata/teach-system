"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Badge, Button, Dialog, Input, Table } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import type { StudentSummary } from "@/lib/server/services/studentManagementService";
import type { EducationStageDoc } from "@/lib/server/repositories/educationStageRepository";
import type { SubjectDoc } from "@/lib/server/repositories/subjectRepository";
import type { SubscriptionDoc } from "@/lib/server/repositories/subscriptionRepository";

interface StudentManagerProps {
  initialStudents: StudentSummary[];
  stages: EducationStageDoc[];
  subjects: SubjectDoc[];
}

interface CreateStudentFormState {
  displayName: string;
  email: string;
  phone: string;
  age: string;
  stageId: string;
}

function emptyCreateForm(stages: EducationStageDoc[]): CreateStudentFormState {
  return { displayName: "", email: "", phone: "", age: "", stageId: stages[0]?.id ?? "" };
}

/**
 * TASK-1904 — Admin-facing Student list with search, per-student
 * enrollment stats (derived server-side by `studentManagementService`
 * from `enrollments`), a deactivate/reactivate action, and account
 * creation (name/email/phone/age + grade level). Table + confirm-dialog
 * shape follows `TeacherManager` (TASK-1903).
 */
export function StudentManager({ initialStudents, stages, subjects }: StudentManagerProps) {
  const t = useTranslations("adminDashboard.students");
  const locale = useLocale();

  const [students, setStudents] = React.useState(initialStudents);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<StudentSummary | null>(null);
  const [pending, setPending] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<CreateStudentFormState>(() => emptyCreateForm(stages));
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const [subscriptionsTarget, setSubscriptionsTarget] = React.useState<StudentSummary | null>(null);

  function localizedName(name?: { en: string; ar: string }): string {
    if (!name) return "—";
    return locale === "ar" ? name.ar || name.en : name.en || name.ar;
  }

  async function refresh(nextSearch: string) {
    setLoading(true);
    setError(null);
    try {
      const url = nextSearch ? `/api/admin/students?search=${encodeURIComponent(nextSearch)}` : "/api/admin/students";
      const res = await fetch(url);
      if (!res.ok) throw new Error("list");
      const body = (await res.json()) as { students: StudentSummary[] };
      setStudents(body.students);
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
      const res = await fetch(`/api/admin/students/${statusTarget.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !statusTarget.disabled }),
      });
      if (!res.ok) throw new Error("update");
      const body = (await res.json()) as { student: StudentSummary };
      setStudents((current) => current.map((student) => (student.uid === body.student.uid ? body.student : student)));
      setStatusTarget(null);
    } catch {
      setError(statusTarget.disabled ? t("errors.activate") : t("errors.deactivate"));
    } finally {
      setPending(false);
    }
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
          role: "student",
          displayName: createForm.displayName,
          email: createForm.email,
          stageId: createForm.stageId,
          ...(createForm.phone ? { phone: createForm.phone } : {}),
          ...(createForm.age ? { age: Number(createForm.age) } : {}),
        }),
      });
      if (!res.ok) throw new Error("create");
      setCreateOpen(false);
      setCreateForm(emptyCreateForm(stages));
      await refresh(search);
    } catch {
      setCreateError(t("errors.create"));
    } finally {
      setCreating(false);
    }
  }

  const columns: Column<StudentSummary>[] = [
    { key: "displayName", header: t("columns.name") },
    { key: "email", header: t("columns.email") },
    {
      key: "stage",
      header: t("columns.stage"),
      render: (row) => localizedName(row.stageName),
    },
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
      key: "enrollments",
      header: t("columns.enrollments"),
      numeric: true,
      render: (row) => row.stats.totalEnrollments,
    },
    {
      key: "active",
      header: t("columns.active"),
      numeric: true,
      render: (row) => row.stats.activeEnrollments,
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
        rows={students}
        rowKey={(row) => row.uid}
        loading={loading}
        emptyMessage={t("empty")}
        rowActions={(row) => (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setSubscriptionsTarget(row)}>
              {t("subscriptions")}
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
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreateForm(emptyCreateForm(stages));
            setCreateError(null);
          }
        }}
        title={t("createTitle")}
        description={t("createDescription")}
      >
        <form onSubmit={submitCreate} className="flex flex-col gap-4">
          {createError && <Alert variant="error">{createError}</Alert>}

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("fields.displayName")}</span>
            <Input
              required
              value={createForm.displayName}
              onChange={(event) => setCreateForm((c) => ({ ...c, displayName: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("fields.email")}</span>
            <Input
              type="email"
              required
              value={createForm.email}
              onChange={(event) => setCreateForm((c) => ({ ...c, email: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("fields.phone")}</span>
            <Input
              type="tel"
              value={createForm.phone}
              onChange={(event) => setCreateForm((c) => ({ ...c, phone: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("fields.age")}</span>
            <Input
              type="number"
              min={2}
              max={25}
              value={createForm.age}
              onChange={(event) => setCreateForm((c) => ({ ...c, age: event.target.value }))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t("fields.stage")}</span>
            <select
              required
              className="h-10 rounded-md border border-border bg-background px-2 text-sm"
              value={createForm.stageId}
              onChange={(event) => setCreateForm((c) => ({ ...c, stageId: event.target.value }))}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {localizedName(stage.name)}
                </option>
              ))}
            </select>
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

      {subscriptionsTarget && (
        <StudentSubscriptionsDialog
          student={subscriptionsTarget}
          subjects={subjects}
          onClose={() => setSubscriptionsTarget(null)}
        />
      )}
    </section>
  );
}

interface StudentSubscriptionsDialogProps {
  student: StudentSummary;
  subjects: SubjectDoc[];
  onClose: () => void;
}

interface OfferingWithTeacherName {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  stageId: string;
  monthlyPrice: number;
}

/**
 * Admin picks which teacher(s) this student subscribes to, one priced
 * (subject, stage) offering at a time — options are pre-filtered to the
 * student's own `stageId` via `GET /api/admin/offerings?stageId=`, so an
 * Admin can never subscribe a student to a grade level they're not in.
 */
function StudentSubscriptionsDialog({ student, subjects, onClose }: StudentSubscriptionsDialogProps) {
  const t = useTranslations("adminDashboard.students");

  const [subscriptions, setSubscriptions] = React.useState<SubscriptionDoc[]>([]);
  const [offerings, setOfferings] = React.useState<OfferingWithTeacherName[]>([]);
  const [selectedOfferingId, setSelectedOfferingId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [latestInvoiceBySub, setLatestInvoiceBySub] = React.useState<
    Record<string, { status: "pending" | "confirmed" | "rejected"; period: string }>
  >({});
  const [generatingInvoiceFor, setGeneratingInvoiceFor] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [subsRes, offeringsRes] = await Promise.all([
          fetch(`/api/admin/students/${student.uid}/subscriptions`),
          student.stageId ? fetch(`/api/admin/offerings?stageId=${encodeURIComponent(student.stageId)}`) : null,
        ]);
        if (!subsRes.ok) throw new Error("subs");
        const subsBody = (await subsRes.json()) as { subscriptions: SubscriptionDoc[] };
        if (cancelled) return;
        setSubscriptions(subsBody.subscriptions.filter((s) => s.status === "active"));

        if (offeringsRes) {
          if (!offeringsRes.ok) throw new Error("offerings");
          const offeringsBody = (await offeringsRes.json()) as { offerings: OfferingWithTeacherName[] };
          if (!cancelled) setOfferings(offeringsBody.offerings);
        }
      } catch {
        if (!cancelled) setError(t("errors.subscriptions"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [student.uid, student.stageId, t]);

  React.useEffect(() => {
    if (subscriptions.length === 0) return;
    let cancelled = false;

    async function loadInvoices() {
      const entries = await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            const res = await fetch(`/api/admin/subscriptions/${sub.id}/invoices`);
            if (!res.ok) return null;
            const body = (await res.json()) as {
              invoices: { status: "pending" | "confirmed" | "rejected"; period: string }[];
            };
            const latest = body.invoices[0];
            return latest ? ([sub.id, { status: latest.status, period: latest.period }] as const) : null;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setLatestInvoiceBySub(Object.fromEntries(entries.filter((e): e is NonNullable<typeof e> => e !== null)));
    }

    void loadInvoices();
    return () => {
      cancelled = true;
    };
  }, [subscriptions]);

  async function generateInvoice(subscriptionId: string) {
    setGeneratingInvoiceFor(subscriptionId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("invoice");
      const body = (await res.json()) as { invoice: { status: "pending" | "confirmed" | "rejected"; period: string } };
      setLatestInvoiceBySub((current) => ({
        ...current,
        [subscriptionId]: { status: body.invoice.status, period: body.invoice.period },
      }));
    } catch {
      setError(t("errors.invoice"));
    } finally {
      setGeneratingInvoiceFor(null);
    }
  }

  const availableOfferings = offerings.filter(
    (offering) => !subscriptions.some((sub) => sub.offeringId === offering.id),
  );

  function subjectName(subjectId: string): string {
    return subjects.find((s) => s.id === subjectId)?.name.ar || subjects.find((s) => s.id === subjectId)?.name.en || subjectId;
  }

  async function subscribe() {
    const offering = offerings.find((o) => o.id === selectedOfferingId);
    if (!offering) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/students/${student.uid}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: offering.teacherId, offeringId: offering.id }),
      });
      if (!res.ok) throw new Error("subscribe");
      const body = (await res.json()) as { subscription: SubscriptionDoc };
      setSubscriptions((current) => [...current, body.subscription]);
      setSelectedOfferingId("");
    } catch {
      setError(t("errors.subscriptions"));
    } finally {
      setSaving(false);
    }
  }

  async function unsubscribe(subscriptionId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/subscriptions/${subscriptionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("unsubscribe");
      setSubscriptions((current) => current.filter((s) => s.id !== subscriptionId));
    } catch {
      setError(t("errors.subscriptions"));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("subscriptionsTitle", { name: student.displayName })}
      description={t("subscriptionsDescription")}
    >
      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        {loading ? (
          <p className="text-sm text-foreground/60">…</p>
        ) : (
          <>
            {subscriptions.length === 0 ? (
              <p className="text-sm text-foreground/60">{t("subscriptionsEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {subscriptions.map((sub) => {
                  const offering = offerings.find((o) => o.id === sub.offeringId);
                  const invoice = latestInvoiceBySub[sub.id];
                  return (
                    <li
                      key={sub.id}
                      className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        {offering?.teacherName ?? sub.teacherId} — {subjectName(sub.subjectId)}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {invoice ? (
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-xs " +
                              (invoice.status === "confirmed"
                                ? "bg-green-500/10 text-green-600"
                                : invoice.status === "rejected"
                                  ? "bg-red-500/10 text-red-600"
                                  : "bg-amber-500/10 text-amber-600")
                            }
                          >
                            {invoice.period} · {t(`invoiceStatus.${invoice.status}`)}
                          </span>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={generatingInvoiceFor === sub.id}
                          onClick={() => generateInvoice(sub.id)}
                        >
                          {t("generateInvoice")}
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => unsubscribe(sub.id)}>
                          {t("unsubscribe")}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {availableOfferings.length === 0 ? (
              <p className="text-sm text-foreground/60">{t("noOfferingsForStage")}</p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <select
                  className="h-10 flex-1 rounded-md border border-border bg-background px-2 text-sm"
                  value={selectedOfferingId}
                  onChange={(event) => setSelectedOfferingId(event.target.value)}
                >
                  <option value="">—</option>
                  {availableOfferings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.teacherName} — {subjectName(offering.subjectId)} — {offering.monthlyPrice} EGP
                    </option>
                  ))}
                </select>
                <Button type="button" loading={saving} disabled={!selectedOfferingId} onClick={subscribe}>
                  {t("subscribe")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
