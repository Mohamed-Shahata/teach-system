import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherDirectoryService } from "@/lib/server/services/teacherDirectoryService";

/** `GET /api/student/teachers` — TASK-3203: every public teacher, each flagged `subscribed` for the caller. */
export async function GET() {
  try {
    const session = await requireSession();
    const teachers = await teacherDirectoryService.listTeacherDirectory(session);
    return NextResponse.json({ teachers });
  } catch (err) {
    return handleApiError(err);
  }
}
