import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentSettingsService } from "@/lib/server/services/studentSettingsService";
import { updatePushEnabledSchema } from "@/lib/validation/account.schema";

/**
 * TASK-2604 — the Student's own OS-level push on/off toggle, separate
 * from the in-app bell (always on). Body: `{ enabled: boolean }`.
 */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const input = updatePushEnabledSchema.parse(await req.json());
    const profile = await studentSettingsService.updatePushPreference(session, input.enabled);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
