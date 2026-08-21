import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { manualSubscriptionPaymentService } from "@/lib/server/services/manualSubscriptionPaymentService";
import { manualSubscriptionPaymentSchema } from "@/lib/validation/manualSubscriptionPayment.schema";

/**
 * `POST /api/admin/payments/manual-subscription` — TASK-3402. Records a
 * cash subscription payment as one action: creates/reuses the
 * subscription and creates a confirmed invoice for the period, both in
 * a single transaction.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = manualSubscriptionPaymentSchema.parse(await req.json());
    const result = await manualSubscriptionPaymentService.recordCashPayment(session, input);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
