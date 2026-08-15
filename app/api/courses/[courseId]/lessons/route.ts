import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { lessonService } from "@/lib/server/services/lessonService";
import { createLessonSchema, reorderLessonsSchema } from "@/lib/validation/lesson.schema";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    const lessons = await lessonService.listLessons(session, courseId);
    return NextResponse.json({ lessons });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    const input = createLessonSchema.parse(await req.json());
    const lesson = await lessonService.createLesson(session, courseId, input);
    return NextResponse.json({ lesson }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * Reordering rewrites the whole course's `lessonOrder` at once (drag-
 * and-drop in the UI, TASK-903) — a distinct operation from editing one
 * lesson's own fields, which stays on `/api/lessons/[lessonId]`. Mirrors
 * the `{ status }` publish toggle being a separate shape from a regular
 * course field update.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    const { lessonIds } = reorderLessonsSchema.parse(await req.json());
    const lessons = await lessonService.reorderLessons(session, courseId, lessonIds);
    return NextResponse.json({ lessons });
  } catch (err) {
    return handleApiError(err);
  }
}
