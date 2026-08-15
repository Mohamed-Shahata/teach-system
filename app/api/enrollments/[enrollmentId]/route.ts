import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import { markLessonCompleteSchema } from "@/lib/validation/enrollment.schema";

interface RouteContext {
  params: Promise<{ enrollmentId: string }>;
}

/** TASK-1102 — a single enrollment; `getEnrollment` gates access via `assertCanViewEnrollment`. */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { enrollmentId } = await params;
    const session = await requireSession();
    const enrollment = await enrollmentService.getEnrollment(session, enrollmentId);
    return NextResponse.json({ enrollment });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * TASK-1102 — progress update: marks one lesson complete for the
 * enrolled student. `status` is never client-writable (server-derived
 * from `progress.percent` in `enrollmentService.markLessonComplete`).
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { enrollmentId } = await params;
    const session = await requireSession();
    const { lessonId } = markLessonCompleteSchema.parse(await req.json());
    const enrollment = await enrollmentService.markLessonComplete(session, enrollmentId, lessonId);
    return NextResponse.json({ enrollment });
  } catch (err) {
    return handleApiError(err);
  }
}
