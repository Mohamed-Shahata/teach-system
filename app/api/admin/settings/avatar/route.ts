import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { adminSettingsService } from "@/lib/server/services/adminSettingsService";
import { updateAvatarSchema } from "@/lib/validation/account.schema";

/**
 * Phase 5 — Persists a profile picture the client already uploaded to
 * Cloudinary via the signed `target: "avatar"` flow. Body:
 * `{ avatarUrl: string, avatarPublicId: string }`. Mirrors
 * `app/api/teacher/settings/avatar/route.ts` / `app/api/student/settings/avatar/route.ts`.
 */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const input = updateAvatarSchema.parse(await req.json());
    const profile = await adminSettingsService.updateAvatar(session, input.avatarUrl, input.avatarPublicId);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
