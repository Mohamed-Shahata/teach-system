"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Badge, Select, Table, Pagination } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import type { AdminPaymentRow } from "@/lib/server/services/adminPaymentsService";
import type { PaymentStatus } from "@/lib/validation/payment.schema";

interface AdminPaymentsOverviewProps {
  initialPayments: AdminPaymentRow[];
}

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<PaymentStatus, "success" | "warning" | "error" | "info"> = {
  pending: "warning",
  succeeded: "success",
  confirmed: "success",
  rejected: "error",
};

const METHOD_LABEL_KEY: Record<string, string> = {
  card: "methods.card",
  fawry: "methods.fawry",
  vodafone_cash: "methods.vodafoneCash",
  bank_transfer: "methods.bankTransfer",
};

/**
 * TASK-1906 — Center-wide payments oversight. Read-only, unlike the
 * teacher's own confirm/reject queue (`PaymentsQueue`, TASK-704) — this
 * is full visibility across every teacher's payments for support/dispute
 * handling, per `features/admin-dashboard.md`. Names are pre-resolved
 * server-side by `adminPaymentsService` so the Admin never has to
 * cross-reference a raw uid by hand.
 */
export function AdminPaymentsOverview({ initialPayments }: AdminPaymentsOverviewProps) {
  const t = useTranslations("adminDashboard.payments");
  const locale = useLocale() as "en" | "ar";

  const [payments, setPayments] = React.useState(initialPayments);
  const [status, setStatus] = React.useState<PaymentStatus | "all">("all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pagedPayments = payments.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  async function refresh(nextStatus: PaymentStatus | "all") {
    setLoading(true);
    setError(null);
    try {
      const url = nextStatus === "all" ? "/api/admin/payments" : `/api/admin/payments?status=${nextStatus}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("list");
      const body = (await res.json()) as { payments: AdminPaymentRow[] };
      setPayments(body.payments);
      setPage(1);
    } catch {
      setError(t("errors.list"));
    } finally {
      setLoading(false);
    }
  }

  function onStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as PaymentStatus | "all";
    setStatus(next);
    void refresh(next);
  }

  const columns: Column<AdminPaymentRow>[] = [
    { key: "student", header: t("columns.student"), render: (row) => row.studentName },
    {
      key: "course",
      header: t("columns.course"),
      render: (row) => row.courseTitle[locale] || row.courseTitle.en || row.courseTitle.ar,
    },
    { key: "teacher", header: t("columns.teacher"), render: (row) => row.teacherName },
    {
      key: "method",
      header: t("columns.method"),
      render: (row) => (
        <span className="flex items-center gap-2">
          <Badge variant="info">{t(METHOD_LABEL_KEY[row.method] ?? "methods.other")}</Badge>
          {row.referenceNote && <span className="truncate text-xs text-foreground/50">{row.referenceNote}</span>}
        </span>
      ),
    },
    {
      key: "amount",
      header: t("columns.amount"),
      numeric: true,
      render: (row) => `${row.amount} ${row.currency}`,
    },
    {
      key: "status",
      header: t("columns.status"),
      render: (row) => <Badge variant={STATUS_BADGE[row.status]}>{t(`status.${row.status}`)}</Badge>,
    },
  ];

  const statusOptions = [
    { value: "all", label: t("filters.all") },
    { value: "pending", label: t("status.pending") },
    { value: "succeeded", label: t("status.succeeded") },
    { value: "confirmed", label: t("status.confirmed") },
    { value: "rejected", label: t("status.rejected") },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/60">{t("subtitle")}</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="max-w-xs">
        <Select
          value={status}
          onChange={onStatusChange}
          options={statusOptions}
          aria-label={t("filters.status")}
        />
      </div>

      <Table
        columns={columns}
        rows={pagedPayments}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage={t("empty")}
      />

      {totalPages > 1 && <Pagination page={clampedPage} totalPages={totalPages} onPageChange={setPage} />}
    </section>
  );
}
