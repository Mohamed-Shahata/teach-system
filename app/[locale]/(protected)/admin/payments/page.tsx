import { requireSession } from "@/lib/auth/session";
import { adminPaymentsOverviewService } from "@/lib/server/services/adminPaymentsService";
import { adminUnsubscribedStudentsService } from "@/lib/server/services/adminUnsubscribedStudentsService";
import { adminSubscriptionsDueForRenewalService } from "@/lib/server/services/adminSubscriptionsDueForRenewalService";
import { AdminPaymentsOverview } from "@/components/admin/admin-payments-overview";
import { UnsubscribedStudentsList } from "@/components/admin/unsubscribed-students-list";
import { DueForRenewalList } from "@/components/admin/due-for-renewal-list";

/**
 * TASK-1906 / TASK-3401 — Center-wide payments oversight (read-only),
 * now covering both payment models (course `payments` + subscription
 * `subscriptionInvoices`) on one page instead of two separate ones.
 * TASK-3403 and TASK-3404 add two follow-up lists alongside it, since
 * both are directly relevant to this page's audience.
 */
export default async function AdminPaymentsPage() {
  const session = await requireSession();
  const [payments, unsubscribedStudents, dueForRenewal] = await Promise.all([
    adminPaymentsOverviewService.listAll(session),
    adminUnsubscribedStudentsService.list(session),
    adminSubscriptionsDueForRenewalService.list(session),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPaymentsOverview initialPayments={payments} />
      <UnsubscribedStudentsList students={unsubscribedStudents} />
      <DueForRenewalList subscriptions={dueForRenewal} />
    </div>
  );
}
