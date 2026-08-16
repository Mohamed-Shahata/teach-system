import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";

/** `GET /api/student/subscription-invoices` — the logged-in student's own billing history. */
export async function GET() {
  try {
    const session = await requireSession();
    const invoices = await subscriptionInvoiceService.listForStudent(session);
    return NextResponse.json({ invoices });
  } catch (err) {
    return handleApiError(err);
  }
}
