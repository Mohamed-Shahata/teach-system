import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";
import { SubscriptionInvoicesQueue } from "@/components/admin/subscription-invoices-queue";

/**
 * TASK-2908 — Admin's center-wide subscription-invoice review queue.
 * Leads with `status=pending` (the actual review work) — confirmed/
 * rejected invoices remain visible in the table after a review action
 * updates them in place, same UX as `PaymentsQueue` fading a row rather
 * than a full re-fetch.
 */
export default async function AdminSubscriptionInvoicesPage() {
  const t = await getTranslations("adminDashboard.subscriptionInvoices");
  const session = await requireSession();
  const invoices = await subscriptionInvoiceService.listForTeacher(session, "pending");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-s-4 border-primary ps-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
      </div>
      <SubscriptionInvoicesQueue initialInvoices={invoices} />
    </div>
  );
}
