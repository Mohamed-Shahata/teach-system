import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { clearSessionCookie, getSession } from "@/lib/auth/session";

export async function POST() {
  try {
    // Read the session before clearing so we know whose refresh tokens to
    // revoke. Not being logged in isn't an error here — logout is
    // idempotent — so a missing/invalid session still clears the cookie
    // and returns success rather than 401.
    const session = await getSession();
    if (session) {
      await adminAuth.revokeRefreshTokens(session.uid);
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });
    clearSessionCookie(res.cookies);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
