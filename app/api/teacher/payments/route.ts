import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { paymentService } from "@/lib/server/services/paymentService";
import { paymentStatusSchema } from "@/lib/validation/payment.schema";

/**
 * TASK-704 — Pending manual payments queue. Lists the teacher's own
 * (or, for Admin, all) payments, optionally filtered by `?status=`.
 * The queue UI (`PaymentsQueue`) always requests `?status=pending`, but
 * the filter is left generic since `paymentService.listForTeacher`
 * already supports it — no reason to hardcode `pending` server-side.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const statusParam = new URL(req.url).searchParams.get("status");
    const status = statusParam ? paymentStatusSchema.parse(statusParam) : undefined;
    const payments = await paymentService.listForTeacher(session, status);
    return NextResponse.json({ payments });
  } catch (err) {
    return handleApiError(err);
  }
}
