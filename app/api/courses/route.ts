import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { courseService } from "@/lib/server/services/courseService";
import { createCourseSchema } from "@/lib/validation/course.schema";

export async function GET() {
  try {
    const session = await requireSession();
    const courses = await courseService.listCourses(session);
    return NextResponse.json({ courses });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createCourseSchema.parse(await req.json());
    const course = await courseService.createCourse(session, input);
    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
