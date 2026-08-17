"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui/badge";
import type { SubscriptionInvoiceDoc } from "@/lib/server/repositories/subscriptionInvoiceRepository";

interface SubscriptionInvoicesPanelProps {
  initialInvoices: SubscriptionInvoiceDoc[];
}

const STATUS_BADGE: Record<SubscriptionInvoiceDoc["status"], BadgeVariant> = {
  pending: "warning",
  confirmed: "success",
  rejected: "error",
};

/**
 * TASK-2909 — the teacher's own subscription-invoice queue/history.
 * `subscriptionInvoiceService.reviewInvoice` already allows the owning
 * teacher (not just Admin, per TASK-2905's `confirmedBy: { role: "admin"
 * | "teacher" }`) to confirm/reject a `pending` bill — this reuses that
 * existing route (`PATCH /api/admin/subscription-invoices/[invoiceId]`,
 * which authorizes by session role/ownership, not by URL segment) rather
 * than adding a `teacher`-prefixed duplicate. Mirrors `PaymentsQueue`
 * (TASK-704): pending rows get confirm/reject actions, reviewed rows
 * just show their resulting status.
 */
export function SubscriptionInvoicesPanel({ initialInvoices }: SubscriptionInvoicesPanelProps) {
  const t = useTranslations("teacherDashboard.subscriptionInvoices");
  const [invoices, setInvoices] = React.useState(initialInvoices);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

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

  if (invoices.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-1 text-xs text-foreground/60">{t("subtitle")}</p>
        </div>

        <div>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
            <span>{t("columns.period")}</span>
            <span>{t("columns.student")}</span>
            <span>{t("columns.amount")}</span>
            <span className="text-end">{t("columns.status")}</span>
          </div>
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 text-sm"
            >
              <span className="text-foreground/70">{invoice.period}</span>
              <span className="text-foreground/70">{invoice.studentId}</span>
              <span className="text-foreground">
                {invoice.amount} {invoice.currency}
              </span>
              <span className="flex justify-end gap-2">
                {invoice.status === "pending" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={pendingId === invoice.id}
                      onClick={() => review(invoice.id, "rejected")}
                    >
                      {t("reject")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      loading={pendingId === invoice.id}
                      onClick={() => review(invoice.id, "confirmed")}
                    >
                      {t("confirm")}
                    </Button>
                  </>
                ) : (
                  <Badge variant={STATUS_BADGE[invoice.status]}>{t(`status.${invoice.status}`)}</Badge>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
