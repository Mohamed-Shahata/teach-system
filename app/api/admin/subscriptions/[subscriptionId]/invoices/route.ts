import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";
import { generateInvoiceSchema } from "@/lib/validation/subscriptionInvoice.schema";

interface RouteContext {
  params: Promise<{ subscriptionId: string }>;
}

/** `GET /api/admin/subscriptions/{subscriptionId}/invoices` — this subscription's billing history. */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { subscriptionId } = await params;
    const session = await requireSession();
    const invoices = await subscriptionInvoiceService.listForSubscription(session, subscriptionId);
    return NextResponse.json({ invoices });
  } catch (err) {
    return handleApiError(err);
  }
}

/** `POST /api/admin/subscriptions/{subscriptionId}/invoices` — Admin generates this month's (or `period`'s) bill. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { subscriptionId } = await params;
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const input = generateInvoiceSchema.parse(body);
    const invoice = await subscriptionInvoiceService.generateInvoice(session, subscriptionId, input);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
