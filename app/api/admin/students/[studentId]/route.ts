import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentManagementService } from "@/lib/server/services/studentManagementService";
import { updateAccountStatusSchema } from "@/lib/validation/account.schema";

interface RouteContext {
  params: Promise<{ studentId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { studentId } = await params;
    const session = await requireSession();
    const student = await studentManagementService.getStudentDetail(session, studentId);
    return NextResponse.json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Body: `{ disabled: boolean }` — `true` deactivates, `false` reactivates. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { studentId } = await params;
    const session = await requireSession();
    const input = updateAccountStatusSchema.parse(await req.json());
    const student = await studentManagementService.setStudentDisabled(session, studentId, input.disabled);
    return NextResponse.json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}
