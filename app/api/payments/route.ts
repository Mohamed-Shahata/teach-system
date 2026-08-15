import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { ValidationError, handleApiError } from "@/lib/errors";
import { paymentService } from "@/lib/server/services/paymentService";
import {
  createPaymentSchema,
  manualPaymentMethodSchema,
  paymentStatusSchema,
} from "@/lib/validation/payment.schema";

/**
 * TASK-1106 — Manual payment flow (student side). A student submits a
 * `pending` `vodafone_cash` / `bank_transfer` payment with a
 * `referenceNote`; the owning teacher or Admin then reviews it via the
 * existing `PATCH /api/teacher/payments/[paymentId]` endpoint (TASK-704),
 * which is backed by `paymentService.confirmManualPayment` /
 * `rejectManualPayment` (TASK-1104) and creates the enrollment as a side
 * effect of confirmation.
 *
 * `card`/`fawry` (online, gateway-driven) are deliberately rejected here —
 * that flow is TASK-1105 (Not Started), which needs a gateway checkout
 * session this route doesn't create. `paymentService.createPayment` itself
 * is method-agnostic (see TASK-1104), so the manual-only restriction is
 * enforced at this route, not the service, to keep it easy to lift once
 * TASK-1105 lands.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const statusParam = new URL(req.url).searchParams.get("status");
    const status = statusParam ? paymentStatusSchema.parse(statusParam) : undefined;
    const payments = await paymentService.listMyPayments(session, status);
    return NextResponse.json({ payments });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createPaymentSchema.parse(await req.json());

    if (!manualPaymentMethodSchema.safeParse(input.method).success) {
      throw new ValidationError();
    }

    const payment = await paymentService.createPayment(session, input);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
