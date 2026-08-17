import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { notificationService } from "@/lib/server/services/notificationService";
import { acknowledgeNotificationSchema } from "@/lib/validation/notification.schema";

interface RouteContext {
  params: Promise<{ notificationId: string }>;
}

/** `PATCH /api/teacher/notifications/[notificationId]/acknowledge` — TASK-3005. Marks one of the signed-in teacher's own `class_reminder` notifications "noted", so it stops showing as active even before it naturally expires. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { notificationId } = await params;
    const session = await requireSession();
    acknowledgeNotificationSchema.parse(await req.json());
    const notification = await notificationService.acknowledgeClassReminder(session, notificationId);
    return NextResponse.json({ notification });
  } catch (err) {
    return handleApiError(err);
  }
}
