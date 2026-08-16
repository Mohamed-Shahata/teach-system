import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";
import { updateTeacherPermissionsSchema } from "@/lib/validation/account.schema";

interface RouteContext {
  params: Promise<{ teacherId: string }>;
}

/**
 * Phase 5 — `PATCH /api/admin/teachers/{teacherId}/permissions`. Body:
 * `{ canCreateStudents: boolean }`. Separate from the existing
 * `PATCH /api/admin/teachers/{teacherId}` (which only ever meant
 * activate/deactivate, TASK-1903) so the two independent toggles don't
 * share one ambiguous endpoint/body shape.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const input = updateTeacherPermissionsSchema.parse(await req.json());
    const teacher = await teacherManagementService.setTeacherPermissions(
      session,
      teacherId,
      input.canCreateStudents,
    );
    return NextResponse.json({ teacher });
  } catch (err) {
    return handleApiError(err);
  }
}
