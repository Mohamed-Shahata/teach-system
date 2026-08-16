import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";
import { updateAccountStatusSchema } from "@/lib/validation/account.schema";

interface RouteContext {
  params: Promise<{ teacherId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const teacher = await teacherManagementService.getTeacherDetail(session, teacherId);
    return NextResponse.json({ teacher });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Body: `{ disabled: boolean }` — `true` deactivates, `false` reactivates. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const input = updateAccountStatusSchema.parse(await req.json());
    const teacher = await teacherManagementService.setTeacherDisabled(session, teacherId, input.disabled);
    return NextResponse.json({ teacher });
  } catch (err) {
    return handleApiError(err);
  }
}
