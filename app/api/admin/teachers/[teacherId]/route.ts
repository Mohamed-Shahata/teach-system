import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";
import { updateTeacherProfileSchema } from "@/lib/validation/account.schema";

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

/**
 * Body: `{ disabled?: boolean, displayName?, email?, phone?, subjectIds? }`.
 * `disabled` toggles activation; the rest is the Teacher management "Edit"
 * action's profile update. Either or both may be present in one request.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const { disabled, ...profile } = updateTeacherProfileSchema.parse(await req.json());
    const hasProfileChanges = Object.values(profile).some((value) => value !== undefined);

    if (!hasProfileChanges && disabled === undefined) {
      const teacher = await teacherManagementService.getTeacherDetail(session, teacherId);
      return NextResponse.json({ teacher });
    }

    if (hasProfileChanges) {
      await teacherManagementService.updateTeacherProfile(session, teacherId, profile);
    }
    const teacher =
      disabled !== undefined
        ? await teacherManagementService.setTeacherDisabled(session, teacherId, disabled)
        : await teacherManagementService.getTeacherDetail(session, teacherId);

    return NextResponse.json({ teacher });
  } catch (err) {
    return handleApiError(err);
  }
}
