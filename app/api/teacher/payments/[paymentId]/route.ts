import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { paymentService } from "@/lib/server/services/paymentService";
import { reviewPaymentSchema } from "@/lib/validation/payment.schema";

interface RouteContext {
  params: Promise<{ paymentId: string }>;
}

/**
 * TASK-704 — Confirm/reject a `pending` manual (`vodafone_cash` /
 * `bank_transfer`) payment. Body is `{ status: "confirmed" | "rejected" }`;
 * the actual role/ownership/state-machine checks live in
 * `paymentService.confirmManualPayment` / `rejectManualPayment`
 * (TASK-1104) — this route only authenticates, validates the body shape,
 * and dispatches to the right service method.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { paymentId } = await params;
    const session = await requireSession();
    const { status } = reviewPaymentSchema.parse(await req.json());

    const payment =
      status === "confirmed"
        ? await paymentService.confirmManualPayment(session, paymentId)
        : await paymentService.rejectManualPayment(session, paymentId);

    return NextResponse.json({ payment });
  } catch (err) {
    return handleApiError(err);
  }
}
