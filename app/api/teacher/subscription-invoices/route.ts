import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";
import { invoiceStatusSchema } from "@/lib/validation/subscriptionInvoice.schema";

/**
 * `GET /api/teacher/subscription-invoices` — the teacher's (or, for
 * Admin, everyone's) subscription billing queue, optionally filtered by
 * `?status=pending` for manual review. Mirrors `/api/teacher/payments`.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const statusParam = new URL(req.url).searchParams.get("status");
    const status = statusParam ? invoiceStatusSchema.parse(statusParam) : undefined;
    const invoices = await subscriptionInvoiceService.listForTeacher(session, status);
    return NextResponse.json({ invoices });
  } catch (err) {
    return handleApiError(err);
  }
}
