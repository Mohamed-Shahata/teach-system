import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentManagementService } from "@/lib/server/services/studentManagementService";
import { updateStudentProfileSchema } from "@/lib/validation/account.schema";

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

/**
 * Body: `{ disabled?: boolean, displayName?, email?, phone?, age?, stageId? }`.
 * `disabled` toggles activation; the rest is the Student management "Edit"
 * action's profile update. Either or both may be present in one request.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { studentId } = await params;
    const session = await requireSession();
    const { disabled, ...profile } = updateStudentProfileSchema.parse(await req.json());
    const hasProfileChanges = Object.values(profile).some((value) => value !== undefined);

    if (!hasProfileChanges && disabled === undefined) {
      const student = await studentManagementService.getStudentDetail(session, studentId);
      return NextResponse.json({ student });
    }

    if (hasProfileChanges) {
      await studentManagementService.updateStudentProfile(session, studentId, profile);
    }
    const student =
      disabled !== undefined
        ? await studentManagementService.setStudentDisabled(session, studentId, disabled)
        : await studentManagementService.getStudentDetail(session, studentId);

    return NextResponse.json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}
