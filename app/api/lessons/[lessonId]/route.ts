import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { lessonService } from "@/lib/server/services/lessonService";
import { updateLessonSchema } from "@/lib/validation/lesson.schema";

interface RouteContext {
  params: Promise<{ lessonId: string }>;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { lessonId } = await params;
    const session = await requireSession();
    const input = updateLessonSchema.parse(await req.json());
    const lesson = await lessonService.updateLesson(session, lessonId, input);
    return NextResponse.json({ lesson });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { lessonId } = await params;
    const session = await requireSession();
    await lessonService.deleteLesson(session, lessonId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
