import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { subscriptionService } from "@/lib/server/services/subscriptionService";
import { createSubscriptionSchema } from "@/lib/validation/subscription.schema";

interface RouteContext {
  params: Promise<{ studentId: string }>;
}

/** `GET /api/admin/students/{studentId}/subscriptions` — this student's teacher subscriptions. */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { studentId } = await params;
    const session = await requireSession();
    const subscriptions = await subscriptionService.listForStudent(session, studentId);
    return NextResponse.json({ subscriptions });
  } catch (err) {
    return handleApiError(err);
  }
}

/** `POST /api/admin/students/{studentId}/subscriptions` — Admin subscribes this student to a teacher's offering. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { studentId } = await params;
    const session = await requireSession();
    const input = createSubscriptionSchema.parse(await req.json());
    const subscription = await subscriptionService.createSubscription(session, studentId, input);
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
