import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { adminPaymentsService } from "@/lib/server/services/adminPaymentsService";
import { paymentStatusSchema } from "@/lib/validation/payment.schema";

/**
 * TASK-1906 — Center-wide payments oversight. Read-only: `GET` only, no
 * `PATCH` here — confirm/reject stays the owning teacher's (or Admin's)
 * job via the existing `PATCH /api/teacher/payments/[paymentId]`
 * (TASK-704/1104), which already accepts an Admin session.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const statusParam = new URL(req.url).searchParams.get("status");
    const status = statusParam ? paymentStatusSchema.parse(statusParam) : undefined;
    const payments = await adminPaymentsService.listAllPayments(session, status);
    return NextResponse.json({ payments });
  } catch (err) {
    return handleApiError(err);
  }
}
