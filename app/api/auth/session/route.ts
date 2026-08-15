import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/errors";
import { createSessionCookieValue, setSessionCookie } from "@/lib/auth/session";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { adminAuth } from "@/lib/server/firebaseAdmin";

const sessionSchema = z.object({ idToken: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { idToken } = sessionSchema.parse(await req.json());
    const cookieValue = await createSessionCookieValue(idToken);

    // `role` isn't on the ID token (no custom claim is set — see
    // docs/authentication/README.md), so it's looked up from `users/{uid}`
    // the same way `getSession()` does, purely so the client can redirect
    // straight to the caller's own dashboard area (`/{locale}/{role}`)
    // instead of guessing.
    const { uid } = await adminAuth.verifyIdToken(idToken);
    const user = await userRepository.findById(uid);

    const res = NextResponse.json({ ok: true, role: user?.role ?? null }, { status: 200 });
    setSessionCookie(res.cookies, cookieValue);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
