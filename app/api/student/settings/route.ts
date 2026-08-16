import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentSettingsService } from "@/lib/server/services/studentSettingsService";
import { updateDisplayNameSchema } from "@/lib/validation/account.schema";

/** TASK-1005 — Student's own profile (display name, email — read-only here, avatar). */
export async function GET() {
  try {
    const session = await requireSession();
    const profile = await studentSettingsService.getProfile(session);
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
    const profile = await studentSettingsService.updateDisplayName(session, input.displayName);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}
