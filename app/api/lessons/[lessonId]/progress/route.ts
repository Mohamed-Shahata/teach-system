import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { lessonProgressService } from "@/lib/server/services/lessonProgressService";
import { reportLessonProgressSchema } from "@/lib/validation/lessonProgress.schema";

interface RouteContext {
  params: Promise<{ lessonId: string }>;
}

/** TASK-2502 — throttled watch-progress report from the student's lesson player. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { lessonId } = await params;
    const session = await requireSession();
    const input = reportLessonProgressSchema.parse(await req.json());
    const progress = await lessonProgressService.reportProgress(session, lessonId, input);
    return NextResponse.json({ progress });
  } catch (err) {
    return handleApiError(err);
  }
}
