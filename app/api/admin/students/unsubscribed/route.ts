import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { adminUnsubscribedStudentsService } from "@/lib/server/services/adminUnsubscribedStudentsService";

/**
 * `GET /api/admin/students/unsubscribed` — TASK-3403. Every student with
 * zero active `subscriptions`, for Admin follow-up.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const students = await adminUnsubscribedStudentsService.list(session);
    return NextResponse.json({ students });
  } catch (err) {
    return handleApiError(err);
  }
}
