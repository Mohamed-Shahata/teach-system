import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherProfileService } from "@/lib/server/services/teacherProfileService";
import { updateTeacherProfileDetailsSchema } from "@/lib/validation/teacherProfile.schema";

/** TASK-3102 — the teacher's own `teacherProfiles` detail fields (bio,
 * headline, yearsOfExperience, specialization, socialLinks, avatarUrl),
 * added by TASK-3101. Separate from `/api/teacher/settings` (account
 * display name/password/avatar on `users`, TASK-705). */
export async function GET() {
  try {
    const session = await requireSession();
    const profile = await teacherProfileService.getMyProfile(session);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Body: any subset of the TASK-3101 fields — a partial patch, same as
 * `teacherProfileRepository.updateDetails`. */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const input = updateTeacherProfileDetailsSchema.parse(await req.json());
    const profile = await teacherProfileService.updateMyProfile(session, input);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
