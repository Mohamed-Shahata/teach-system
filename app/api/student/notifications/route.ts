import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { notificationService } from "@/lib/server/services/notificationService";

/** `GET /api/student/notifications` — the logged-in student's own notifications (Phase 6). */
export async function GET() {
  try {
    const session = await requireSession();
    const notifications = await notificationService.listMyNotifications(session);
    return NextResponse.json({ notifications });
  } catch (err) {
    return handleApiError(err);
  }
}
