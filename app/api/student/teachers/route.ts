import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherDirectoryService } from "@/lib/server/services/teacherDirectoryService";

/** `GET /api/student/teachers` — the logged-in student's "my teachers" list (TASK-2301). */
export async function GET() {
  try {
    const session = await requireSession();
    const teachers = await teacherDirectoryService.listMyTeachers(session);
    return NextResponse.json({ teachers });
  } catch (err) {
    return handleApiError(err);
  }
}
