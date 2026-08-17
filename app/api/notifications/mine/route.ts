import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { notificationService } from "@/lib/server/services/notificationService";

/**
 * `GET /api/notifications/mine` — TASK-3003. The signed-in user's own
 * generic `audit` notifications, any role. Kept separate from
 * `/api/student/notifications` and `/api/teacher/notifications` (which
 * stay scoped to `meeting_link`/`class_reminder`) since this one is the
 * only role-agnostic notification list — Admins have no `meeting_link`/
 * `class_reminder` equivalent, but do get `audit` entries.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const notifications = await notificationService.listMyAuditNotifications(session);
    return NextResponse.json({ notifications });
  } catch (err) {
    return handleApiError(err);
  }
}
