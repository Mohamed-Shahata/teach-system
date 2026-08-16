import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentService } from "@/lib/server/services/studentService";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * TASK-2504: powers `CourseStudentsPanel` on the teacher course detail
 * page. Mirrors `GET /api/courses/[courseId]/lessons`'s shape/error
 * handling.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    const students = await studentService.getCourseStudentsProgress(session, courseId);
    return NextResponse.json({ students });
  } catch (err) {
    return handleApiError(err);
  }
}
