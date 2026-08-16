import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";
import { generateInvoiceSchema } from "@/lib/validation/subscriptionInvoice.schema";

/**
 * `POST /api/admin/subscription-invoices/generate` — the "run monthly
 * billing" bulk action: generates this month's (or `period`'s) invoice for
 * every active subscription that doesn't already have one.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const input = generateInvoiceSchema.parse(body);
    const invoices = await subscriptionInvoiceService.generateForAllActiveSubscriptions(session, input.period);
    return NextResponse.json({ invoices, generated: invoices.length }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
