"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Alert, Badge, Button } from "@/components/ui";
import type { PaymentDoc } from "@/lib/server/repositories/paymentRepository";

interface PaymentsQueueProps {
  initialPayments: PaymentDoc[];
}

const METHOD_LABEL_KEY: Record<string, string> = {
  vodafone_cash: "methods.vodafoneCash",
  bank_transfer: "methods.bankTransfer",
};

/**
 * TASK-704 — Pending manual (`vodafone_cash` / `bank_transfer`) payments
 * queue for the teacher dashboard. Confirm/reject call the owning
 * teacher's own review endpoint (`PATCH /api/teacher/payments/[id]`),
 * which is backed by `paymentService.confirmManualPayment` /
 * `rejectManualPayment` (TASK-1104) — confirming also creates the
 * enrollment server-side, so this component doesn't touch enrollment
 * at all, it just reflects the resulting payment status.
 */
export function PaymentsQueue({ initialPayments }: PaymentsQueueProps) {
  const t = useTranslations("teacherDashboard.payments");
  const [payments, setPayments] = React.useState(initialPayments);
  const [error, setError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function review(id: string, status: "confirmed" | "rejected") {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/teacher/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("review");
      setPayments((current) => current.filter((payment) => payment.id !== id));
    } catch {
      setError(status === "confirmed" ? t("errors.confirm") : t("errors.reject"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
          <p className="mt-1 text-xs text-foreground/60">{t("subtitle")}</p>
        </div>

        {payments.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center">
            <h3 className="text-sm font-semibold text-foreground">{t("emptyTitle")}</h3>
            <p className="mt-1 max-w-xs text-xs leading-6 text-foreground/60">{t("emptyDescription")}</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 bg-surface-muted px-4 py-2 text-sm font-medium text-foreground">
              <span>{t("columns.student")}</span>
              <span>{t("columns.method")}</span>
              <span>{t("columns.amount")}</span>
              <span className="text-end">{t("columns.actions")}</span>
            </div>
            {payments.map((payment) => (
              <div key={payment.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 text-sm">
                <span className="text-foreground/70">{payment.studentId}</span>
                <span className="flex items-center gap-2 text-foreground/70">
                  <Badge variant="info">{t(METHOD_LABEL_KEY[payment.method] ?? "methods.other")}</Badge>
                  {payment.referenceNote && (
                    <span className="truncate text-xs text-foreground/50">{payment.referenceNote}</span>
                  )}
                </span>
                <span className="text-foreground">
                  {payment.amount} {payment.currency}
                </span>
                <span className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={pendingId === payment.id}
                    onClick={() => review(payment.id, "rejected")}
                  >
                    {t("reject")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    loading={pendingId === payment.id}
                    onClick={() => review(payment.id, "confirmed")}
                  >
                    {t("confirm")}
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
