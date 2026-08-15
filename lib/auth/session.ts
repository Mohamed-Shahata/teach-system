import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { UnauthorizedError } from "@/lib/errors";
import type { UserRole } from "@/lib/validation/auth.schema";

/**
 * The subset of the cookie-setting API shared by `cookies()` (Route
 * Handlers/Server Actions) and `NextResponse.cookies` — avoids depending
 * on Next's internal `next/dist/...` cookie types, which aren't a stable
 * public API across versions.
 */
interface SettableCookieStore {
  set(
    name: string,
    value: string,
    options: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "lax" | "strict" | "none";
      path?: string;
      maxAge?: number;
    },
  ): void;
}

export const SESSION_COOKIE_NAME = "session";

// 5 days, matching the createSessionCookie expiresIn below.
const SESSION_EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000;

export interface Session {
  uid: string;
  email: string | undefined;
  role: UserRole;
}

/**
 * Exchanges a fresh Firebase ID token for a session cookie value.
 * Verifies the token first so an expired/forged token can't be turned
 * into a long-lived session.
 */
export async function createSessionCookieValue(idToken: string): Promise<string> {
  try {
    await adminAuth.verifyIdToken(idToken);
    return await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError();
  }
}

/**
 * Sets the session cookie on a mutable cookie store (a Route Handler's
 * `cookies()` or a `NextResponse`'s `.cookies`). `HttpOnly` + `Secure` +
 * `SameSite=Lax` per docs/authentication/README.md.
 */
export function setSessionCookie(store: SettableCookieStore, value: string): void {
  store.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRES_IN_MS / 1000,
  });
}

export function clearSessionCookie(store: SettableCookieStore): void {
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Reads and verifies the session cookie from the current request (Server
 * Components / Route Handlers). Checks revocation so a logged-out or
 * password-changed session can't still be used. `role` is never trusted
 * from the token itself — no custom claim is set at registration — so it
 * is read from `users/{uid}.role`, the single source of truth per
 * docs/authorization/README.md. Returns `null` rather than throwing when
 * there is no valid session; callers that require one should use
 * `requireSession`.
 */
/**
 * Verifies a raw session cookie value (already extracted from the
 * request) and resolves it to a `Session`. Shared by `getSession()`
 * (Server Components/Route Handlers, via `next/headers`) and `proxy.ts`
 * (which reads the cookie off `NextRequest` and has no access to
 * `next/headers`). Returns `null` for any missing/invalid/revoked cookie
 * or missing user doc rather than throwing, so callers can uniformly
 * treat "no session" as "redirect to login".
 */
export async function verifySessionCookieValue(cookie: string | undefined): Promise<Session | null> {
  if (!cookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true /* checkRevoked */);
    const user = await userRepository.findById(decoded.uid);
    if (!user) return null;
    return { uid: decoded.uid, email: decoded.email, role: user.role };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return verifySessionCookieValue(store.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
