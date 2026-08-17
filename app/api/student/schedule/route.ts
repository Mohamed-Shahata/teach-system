import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentScheduleService } from "@/lib/server/services/studentScheduleService";

/** `GET /api/student/schedule` — TASK-3205: every schedule slot for every teacher the student is subscribed to. */
export async function GET() {
  try {
    const session = await requireSession();
    const slots = await studentScheduleService.listMySchedule(session);
    return NextResponse.json({ slots });
  } catch (err) {
    return handleApiError(err);
  }
}
