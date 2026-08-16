import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { notificationService } from "@/lib/server/services/notificationService";
import { markNotificationReadSchema } from "@/lib/validation/notification.schema";

interface RouteContext {
  params: Promise<{ notificationId: string }>;
}

/** `PATCH /api/teacher/notifications/[notificationId]` — mark one of the teacher's own class reminders read. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { notificationId } = await params;
    const session = await requireSession();
    markNotificationReadSchema.parse(await req.json());
    const notification = await notificationService.markNotificationRead(session, notificationId);
    return NextResponse.json({ notification });
  } catch (err) {
    return handleApiError(err);
  }
}
