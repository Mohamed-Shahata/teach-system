import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentProfileService } from "@/lib/server/services/studentProfileService";
import { updateStudentOwnProfileSchema } from "@/lib/validation/user.schema";

/**
 * TASK-3201 — the student's own lightweight profile: `displayName`,
 * `avatarUrl`, `birthDate`/derived `age`, and a read-only `stageId` (+
 * display name). Distinct from `/api/student/settings` (TASK-1005's
 * account page — displayName/avatar/password); `displayName` is shared
 * between the two, but avatar upload itself still goes through
 * `/api/student/settings/avatar`, not this route.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const profile = await studentProfileService.getMyProfile(session);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * Body: any subset of `{ displayName, birthDate }` — a partial patch.
 * `stageId` is intentionally never accepted here (read-only for a
 * student; only an Admin can change it via Student management).
 */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const input = updateStudentOwnProfileSchema.parse(await req.json());
    const profile = await studentProfileService.updateMyProfile(session, input);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
