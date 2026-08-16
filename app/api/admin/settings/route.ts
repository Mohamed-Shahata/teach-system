import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { adminSettingsService } from "@/lib/server/services/adminSettingsService";
import { updateDisplayNameSchema } from "@/lib/validation/account.schema";

/** TASK-1907 — Admin's own profile (display name, email — read-only here). */
export async function GET() {
  try {
    const session = await requireSession();
    const profile = await adminSettingsService.getProfile(session);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Body: `{ displayName: string }`. */
export async function PATCH(req: Request) {
  try {
    const session = await requireSession();
    const input = updateDisplayNameSchema.parse(await req.json());
    const profile = await adminSettingsService.updateDisplayName(session, input.displayName);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
