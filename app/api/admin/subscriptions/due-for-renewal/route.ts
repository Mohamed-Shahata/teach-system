import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { adminSubscriptionsDueForRenewalService } from "@/lib/server/services/adminSubscriptionsDueForRenewalService";

/**
 * `GET /api/admin/subscriptions/due-for-renewal` — TASK-3404. Every
 * active subscription with no confirmed invoice for the current period.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const subscriptions = await adminSubscriptionsDueForRenewalService.list(session);
    return NextResponse.json({ subscriptions });
  } catch (err) {
    return handleApiError(err);
  }
}
