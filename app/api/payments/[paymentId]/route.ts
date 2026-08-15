import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { paymentService } from "@/lib/server/services/paymentService";

interface RouteContext {
  params: Promise<{ paymentId: string }>;
}

/**
 * TASK-1106 — a single payment, so a student can poll their own manual
 * payment's status after submitting it (pending → confirmed/rejected).
 * `paymentService.getPayment` already gates access to the owning student,
 * owning teacher, or Admin (TASK-1104) — same pattern as
 * `GET /api/enrollments/[enrollmentId]` (TASK-1102), which also doubles
 * as the teacher/Admin single-resource read.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { paymentId } = await params;
    const session = await requireSession();
    const payment = await paymentService.getPayment(session, paymentId);
    return NextResponse.json({ payment });
  } catch (err) {
    return handleApiError(err);
  }
}
