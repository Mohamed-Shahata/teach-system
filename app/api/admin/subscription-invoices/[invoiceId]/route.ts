import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";
import { reviewInvoiceSchema } from "@/lib/validation/subscriptionInvoice.schema";

interface RouteContext {
  params: Promise<{ invoiceId: string }>;
}

/** `GET /api/admin/subscription-invoices/{invoiceId}` — Admin, the owning teacher, or the billed student. */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { invoiceId } = await params;
    const session = await requireSession();
    const invoice = await subscriptionInvoiceService.getInvoice(session, invoiceId);
    return NextResponse.json({ invoice });
  } catch (err) {
    return handleApiError(err);
  }
}

/** `PATCH /api/admin/subscription-invoices/{invoiceId}` — owning teacher or Admin confirms/rejects a pending invoice. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { invoiceId } = await params;
    const session = await requireSession();
    const input = reviewInvoiceSchema.parse(await req.json());
    const invoice = await subscriptionInvoiceService.reviewInvoice(session, invoiceId, input);
    return NextResponse.json({ invoice });
  } catch (err) {
    return handleApiError(err);
  }
}
