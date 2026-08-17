import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { SubscriptionInvoiceDoc } from "@/lib/server/repositories/subscriptionInvoiceRepository";

interface SubscriptionInvoicesPanelProps {
  invoices: SubscriptionInvoiceDoc[];
}

const STATUS_BADGE: Record<SubscriptionInvoiceDoc["status"], BadgeVariant> = {
  pending: "warning",
  confirmed: "success",
  rejected: "error",
};

/**
 * TASK-2909 — the student's own subscription-invoice history, read-only
 * (invoices are Admin-generated and Admin/teacher-reviewed — a student
 * never confirms/rejects their own bill, unlike `PaymentsQueue`'s
 * teacher-side actions). Server component: the data doesn't change from
 * client interaction here, so no client-side state is needed, matching
 * `student/dashboard`'s own read-only enrollment cards.
 */
export async function SubscriptionInvoicesPanel({ invoices }: SubscriptionInvoicesPanelProps) {
  const t = await getTranslations("studentDashboard.subscriptionInvoices");

  if (invoices.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{invoice.period}</span>
              <span className="text-xs text-foreground/60">
                {invoice.amount} {invoice.currency}
              </span>
            </div>
            <Badge variant={STATUS_BADGE[invoice.status]}>{t(`status.${invoice.status}`)}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
