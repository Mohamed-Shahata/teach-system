"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button, Table } from "@/components/ui";
import { TableActionsMenu } from "@/components/ui/table-actions-menu";
import type { Column } from "@/components/ui/table";
import type { SubscriptionInvoiceDoc } from "@/lib/server/repositories/subscriptionInvoiceRepository";

interface SubscriptionInvoicesQueueProps {
  initialInvoices: SubscriptionInvoiceDoc[];
}

const STATUS_BADGE: Record<SubscriptionInvoiceDoc["status"], "success" | "warning" | "error"> = {
  pending: "warning",
  confirmed: "success",
  rejected: "error",
};

/**
 * TASK-2908 — Admin's center-wide subscription-invoice review queue.
 * `subscriptionInvoiceService.listForTeacher`/`generateForAllActiveSubscriptions`
 * already worked for an Admin session (same `scopeToTeacher` bypass
 * `paymentRepository` uses, TASK-1106's note) — this was the missing UI:
 * a `PaymentsQueue`-shaped confirm/reject view (TASK-704) plus a "run
 * monthly billing" bulk action, backed by the already-existing
 * `POST /api/admin/subscription-invoices/generate` and
 * `PATCH /api/admin/subscription-invoices/[invoiceId]` routes. Offering
 * management (`TeacherManager`) and per-student subscribe/generate
 * (`StudentManager`) already existed before this task — see this
 * component's own phase note in `phase-29-teacher-subscriptions.md` for
 * the full picture of what TASK-2908 actually added.
 */
export function SubscriptionInvoicesQueue({ initialInvoices }: SubscriptionInvoicesQueueProps) {
  const t = useTranslations("adminDashboard.subscriptionInvoices");
  const [invoices, setInvoices] = React.useState(initialInvoices);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);

  async function review(id: string, status: "confirmed" | "rejected") {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/subscription-invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("review");
      const body = (await res.json()) as { invoice: SubscriptionInvoiceDoc };
      setInvoices((current) => current.map((invoice) => (invoice.id === id ? body.invoice : invoice)));
    } catch {
      setError(status === "confirmed" ? t("errors.confirm") : t("errors.reject"));
    } finally {
      setPendingId(null);
    }
  }

  async function generateThisMonth() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/subscription-invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("generate");
      const body = (await res.json()) as { invoices: SubscriptionInvoiceDoc[] };
      setInvoices((current) => [...body.invoices, ...current]);
    } catch {
      setError(t("errors.generate"));
    } finally {
      setGenerating(false);
    }
  }

  const columns: Column<SubscriptionInvoiceDoc>[] = [
    { key: "period", header: t("columns.period"), render: (row) => row.period },
    { key: "studentId", header: t("columns.student"), render: (row) => row.studentId },
    { key: "teacherId", header: t("columns.teacher"), render: (row) => row.teacherId },
    { key: "amount", header: t("columns.amount"), render: (row) => `${row.amount} ${row.currency}` },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) => <Badge variant={STATUS_BADGE[row.status]}>{t(`status.${row.status}`)}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
        <Button type="button" variant="outline" loading={generating} onClick={generateThisMonth}>
          {t("generateThisMonth")}
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Table
        columns={columns}
        rows={invoices}
        rowKey={(row) => row.id}
        emptyMessage={t("empty")}
        actionsLabel={t("columns.actions")}
        rowActions={(row) =>
          row.status === "pending" ? (
            <TableActionsMenu
              triggerLabel={t("columns.actions")}
              actions={[
                {
                  label: t("confirm"),
                  disabled: pendingId === row.id,
                  onClick: () => review(row.id, "confirmed"),
                },
                {
                  label: t("reject"),
                  variant: "destructive",
                  disabled: pendingId === row.id,
                  onClick: () => review(row.id, "rejected"),
                },
              ]}
            />
          ) : null
        }
      />
    </div>
  );
}
