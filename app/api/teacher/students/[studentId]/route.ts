import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentService } from "@/lib/server/services/studentService";

interface RouteContext {
  params: Promise<{ studentId: string }>;
}

/**
 * TASK-1002 — a single student's detail view (enrolled courses + progress)
 * scoped to the requesting teacher's own courses. Quiz results are out of
 * scope here — see `studentService`'s doc comment and
 * `docs/tasks/phase-10-student-management.md`.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { studentId } = await params;
    const session = await requireSession();
    const student = await studentService.getStudentDetail(session, studentId);
    return NextResponse.json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}
