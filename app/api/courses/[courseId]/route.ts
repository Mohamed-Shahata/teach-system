import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { updateCourseSchema, updateCourseStatusSchema } from "@/lib/validation/course.schema";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    const course = await courseService.getCourse(session, courseId);
    return NextResponse.json({ course });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * A body of `{ status }` is the publish/unpublish toggle (TASK-803) and
 * goes through `publishCourse`/`unpublishCourse` so the
 * `teacherProfiles.stats.totalPublishedCourses` counter stays in sync.
 * Any other body is a regular field update via `updateCourse`. The two
 * are mutually exclusive per request — mirrors `courseService`, which
 * doesn't merge a status transition with other field changes either.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    const body = await req.json();

    if (body && typeof body === "object" && "status" in body) {
      const { status } = updateCourseStatusSchema.parse(body);
      const course =
        status === "published"
          ? await courseService.publishCourse(session, courseId)
          : await courseService.unpublishCourse(session, courseId);
      return NextResponse.json({ course });
    }

    const input = updateCourseSchema.parse(body);
    const course = await courseService.updateCourse(session, courseId, input);
    return NextResponse.json({ course });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    await courseService.deleteCourse(session, courseId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
