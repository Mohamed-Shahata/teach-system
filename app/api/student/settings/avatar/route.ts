import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentSettingsService } from "@/lib/server/services/studentSettingsService";
import { updateAvatarSchema } from "@/lib/validation/account.schema";

/**
 * TASK-1005 — Persists a profile picture the client already uploaded to
 * Cloudinary via the signed `target: "avatar"` flow
 * (`POST /api/uploads/sign` + `lib/client/upload.ts`'s `uploadImage`).
 * Body: `{ avatarUrl: string, avatarPublicId: string }`.
 */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const input = updateAvatarSchema.parse(await req.json());
    const profile = await studentSettingsService.updateAvatar(session, input.avatarUrl, input.avatarPublicId);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
