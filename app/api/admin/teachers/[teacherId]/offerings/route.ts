import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherOfferingService } from "@/lib/server/services/teacherOfferingService";
import { createTeacherOfferingSchema } from "@/lib/validation/teacherOffering.schema";

interface RouteContext {
  params: Promise<{ teacherId: string }>;
}

/** `GET /api/admin/teachers/{teacherId}/offerings` — this teacher's priced (subject, stage) offerings. */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const offerings = await teacherOfferingService.listForTeacher(session, teacherId);
    return NextResponse.json({ offerings });
  } catch (err) {
    return handleApiError(err);
  }
}

/** `POST /api/admin/teachers/{teacherId}/offerings` — Admin prices a new (subject, stage) pair for this teacher. */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const input = createTeacherOfferingSchema.parse(await req.json());
    const offering = await teacherOfferingService.createOffering(session, teacherId, input);
    return NextResponse.json({ offering }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
