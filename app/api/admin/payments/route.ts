import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { adminPaymentsOverviewService } from "@/lib/server/services/adminPaymentsService";
import { invoiceStatusSchema } from "@/lib/validation/subscriptionInvoice.schema";

/**
 * TASK-1906 / TASK-3401 — Center-wide payments oversight, now combining
 * both payment models (course `payments` + subscription
 * `subscriptionInvoices`) into one list. Read-only: `GET` only — confirm/
 * reject stays each model's own review flow (`PATCH
 * /api/teacher/payments/[paymentId]` for course payments, the
 * `admin/subscription-invoices` queue for subscription invoices).
 * `invoiceStatusSchema` (`pending`/`confirmed`/`rejected`) is reused for
 * the combined filter since it's exactly the three-value status space
 * `adminPaymentsOverviewService.listAll` normalizes both models onto.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const statusParam = new URL(req.url).searchParams.get("status");
    const status = statusParam ? invoiceStatusSchema.parse(statusParam) : undefined;
    const payments = await adminPaymentsOverviewService.listAll(session, status);
    return NextResponse.json({ payments });
  } catch (err) {
    return handleApiError(err);
  }
}
