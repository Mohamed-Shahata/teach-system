import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { subscriptionService } from "@/lib/server/services/subscriptionService";

interface RouteContext {
  params: Promise<{ subscriptionId: string }>;
}

/** `DELETE /api/admin/subscriptions/{subscriptionId}` — Admin cancels this subscription. */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { subscriptionId } = await params;
    const session = await requireSession();
    const subscription = await subscriptionService.cancelSubscription(session, subscriptionId);
    return NextResponse.json({ subscription });
  } catch (err) {
    return handleApiError(err);
  }
}
