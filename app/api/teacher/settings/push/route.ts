import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherSettingsService } from "@/lib/server/services/teacherSettingsService";
import { updatePushEnabledSchema } from "@/lib/validation/account.schema";

/**
 * TASK-2604 — the Teacher's own OS-level push on/off toggle, separate
 * from the in-app bell (always on). Body: `{ enabled: boolean }`.
 */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const input = updatePushEnabledSchema.parse(await req.json());
    const profile = await teacherSettingsService.updatePushPreference(session, input.enabled);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
