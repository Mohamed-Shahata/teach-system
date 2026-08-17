import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { fcmTokenService } from "@/lib/server/services/fcmTokenService";

interface RouteContext {
  params: Promise<{ tokenId: string }>;
}

/** TASK-2602 — unregister one of the caller's own device tokens. */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { tokenId } = await params;
    const session = await requireSession();
    await fcmTokenService.removeToken(session, tokenId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
