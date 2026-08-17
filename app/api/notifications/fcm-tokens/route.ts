import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { fcmTokenService } from "@/lib/server/services/fcmTokenService";
import { registerFcmTokenSchema } from "@/lib/validation/fcmToken.schema";

/** TASK-2602 — register/update the caller's own device token. Any signed-in role. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = registerFcmTokenSchema.parse(await req.json());
    const token = await fcmTokenService.registerToken(session, input);
    return NextResponse.json({ token });
  } catch (err) {
    return handleApiError(err);
  }
}

/** The caller's own registered device tokens — token values are only ever used server-side (TASK-2603), not surfaced beyond this for now. */
export async function GET() {
  try {
    const session = await requireSession();
    const tokens = await fcmTokenService.listMyTokens(session);
    return NextResponse.json({ tokens });
  } catch (err) {
    return handleApiError(err);
  }
}
