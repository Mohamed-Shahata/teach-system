import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { notificationService } from "@/lib/server/services/notificationService";

interface RouteContext {
  params: Promise<{ scheduleId: string }>;
}

/**
 * TASK-1602 (Phase 6, item 18) — "send to all students" button. Fans the
 * slot's `meetingUrl` out to every active student of this teacher who sits
 * in exactly this slot's `stageId`; see `notificationService.sendMeetingLink`
 * for the exact filter.
 */
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { scheduleId } = await params;
    const session = await requireSession();
    const result = await notificationService.sendMeetingLink(session, scheduleId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
