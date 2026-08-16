import { requireSession } from "@/lib/auth/session";
import { adminPaymentsService } from "@/lib/server/services/adminPaymentsService";
import { AdminPaymentsOverview } from "@/components/admin/admin-payments-overview";

/**
 * TASK-1906 — Center-wide payments oversight (read-only).
 */
export default async function AdminPaymentsPage() {
  const session = await requireSession();
  const payments = await adminPaymentsService.listAllPayments(session);

  return <AdminPaymentsOverview initialPayments={payments} />;
}
