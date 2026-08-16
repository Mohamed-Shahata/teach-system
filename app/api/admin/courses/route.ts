import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { adminCourseOverviewService } from "@/lib/server/services/adminCourseOverviewService";

/** `GET /api/admin/courses` — center-wide, read-only course list (TASK-2401). */
export async function GET() {
  try {
    const session = await requireSession();
    const courses = await adminCourseOverviewService.listCourses(session);
    return NextResponse.json({ courses });
  } catch (err) {
    return handleApiError(err);
  }
}
