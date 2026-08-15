import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { enrollmentService } from "@/lib/server/services/enrollmentService";
import { enrollmentStatusSchema } from "@/lib/validation/enrollment.schema";

/**
 * TASK-1102 — a student's own enrollments, optionally filtered by
 * `?status=`. Enrollment *creation* has no endpoint here — it only ever
 * happens server-side as a side effect of the payments flow
 * (TASK-1105/1106), per `enrollmentService.createEnrollment`.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const statusParam = new URL(req.url).searchParams.get("status");
    const status = statusParam ? enrollmentStatusSchema.parse(statusParam) : undefined;
    const enrollments = await enrollmentService.listMyEnrollments(session, status);
    return NextResponse.json({ enrollments });
  } catch (err) {
    return handleApiError(err);
  }
}
