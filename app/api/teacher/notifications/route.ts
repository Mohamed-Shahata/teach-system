import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { notificationService } from "@/lib/server/services/notificationService";

/** `GET /api/teacher/notifications` — the logged-in teacher's own class reminders (TASK-2003/2004). */
export async function GET() {
  try {
    const session = await requireSession();
    const notifications = await notificationService.listMyClassReminders(session);
    return NextResponse.json({ notifications });
  } catch (err) {
    return handleApiError(err);
  }
}
