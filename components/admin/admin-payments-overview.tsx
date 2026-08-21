"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Badge, Select, Table, Pagination } from "@/components/ui";
import type { Column } from "@/components/ui/table";
import type { CombinedPaymentRow, CombinedPaymentStatus } from "@/lib/server/services/adminPaymentsService";

interface AdminPaymentsOverviewProps {
  initialPayments: CombinedPaymentRow[];
}

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<CombinedPaymentStatus, "success" | "warning" | "error"> = {
  pending: "warning",
  confirmed: "success",
  rejected: "error",
};

const METHOD_LABEL_KEY: Record<string, string> = {
  card: "methods.card",
  fawry: "methods.fawry",
  vodafone_cash: "methods.vodafoneCash",
  bank_transfer: "methods.bankTransfer",
  cash: "methods.cash",
};

/**
 * TASK-1906 / TASK-3401 — Center-wide payments oversight. Read-only,
 * unlike the teacher's own confirm/reject queue (`PaymentsQueue`,
 * TASK-704) or the Admin's subscription-invoice review queue
 * (`SubscriptionInvoicesQueue`, TASK-2908) — this is a single combined
 * list across both payment models (course `payments` + subscription
 * `subscriptionInvoices`) for support/dispute handling and general
 * visibility, per this task's acceptance criteria. Status filtering
 * refetches (server-normalized across both models); search by student or
 * teacher name is client-side only, same low-traffic-admin-page
 * reasoning as everywhere else in this file.
 */
export function AdminPaymentsOverview({ initialPayments }: AdminPaymentsOverviewProps) {
  const t = useTranslations("adminDashboard.payments");
  const locale = useLocale() as "en" | "ar";

  const [payments, setPayments] = React.useState(initialPayments);
  const [status, setStatus] = React.useState<CombinedPaymentStatus | "all">("all");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);

  const searched = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (row) => row.studentName.toLowerCase().includes(q) || row.teacherName.toLowerCase().includes(q),
    );
  }, [payments, search]);

  const totalPages = Math.max(1, Math.ceil(searched.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pagedPayments = searched.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  async function refresh(nextStatus: CombinedPaymentStatus | "all") {
    setLoading(true);
    setError(null);
    try {
      const url = nextStatus === "all" ? "/api/admin/payments" : `/api/admin/payments?status=${nextStatus}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("list");
      const body = (await res.json()) as { payments: CombinedPaymentRow[] };
      setPayments(body.payments);
      setPage(1);
    } catch {
      setError(t("errors.list"));
    } finally {
      setLoading(false);
    }
  }

  function onStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as CombinedPaymentStatus | "all";
    setStatus(next);
    void refresh(next);
  }

  function onSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
    setPage(1);
  }

  const columns: Column<CombinedPaymentRow>[] = [
    { key: "student", header: t("columns.student"), render: (row) => row.studentName },
    {
      key: "item",
      header: t("columns.course"),
      render: (row) => row.itemLabel[locale] || row.itemLabel.en || row.itemLabel.ar,
    },
    { key: "teacher", header: t("columns.teacher"), render: (row) => row.teacherName },
    {
      key: "source",
      header: t("columns.type"),
      render: (row) => <Badge variant="info">{t(`sources.${row.source}`)}</Badge>,
    },
    {
      key: "method",
      header: t("columns.method"),
      render: (row) => (
        <span className="flex items-center gap-2">
          {row.method && <Badge variant="info">{t(METHOD_LABEL_KEY[row.method] ?? "methods.other")}</Badge>}
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="max-w-xs">
          <Select
            value={status}
            onChange={onStatusChange}
            options={statusOptions}
            aria-label={t("filters.status")}
          />
        </div>
        <input
          type="search"
          value={search}
          onChange={onSearchChange}
          placeholder={t("filters.searchPlaceholder")}
          aria-label={t("filters.search")}
          className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40"
        />
        <Link
          href="/admin/subscription-invoices"
          className="ms-auto text-sm text-primary underline-offset-2 hover:underline"
        >
          {t("linkToInvoiceQueue")}
        </Link>
      </div>

      <Table
        columns={columns}
        rows={pagedPayments}
        rowKey={(row) => `${row.source}:${row.id}`}
        loading={loading}
        emptyMessage={t("empty")}
      />

      {totalPages > 1 && <Pagination page={clampedPage} totalPages={totalPages} onPageChange={setPage} />}
    </section>
  );
}
