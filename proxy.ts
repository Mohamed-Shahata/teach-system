import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";
import { SESSION_COOKIE_NAME, verifySessionCookieValue } from "./lib/auth/session";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

/**
 * Route groups — `(public)` / `(protected)` — are organizational only and
 * never appear in the URL, so protected areas are identified by their
 * top-level path segment instead, per
 * docs/architecture/folder-structure.md (`(protected)/teacher|student|admin/*`).
 */
const PROTECTED_SEGMENTS = new Set(["teacher", "student", "admin"]);

/**
 * Auth-only pages that make no sense for an already-signed-in visitor.
 * If a valid session cookie is present, these bounce to the user's own
 * dashboard instead of rendering (e.g. so `/login` never shows for a
 * signed-in user who lands on it via a stale bookmark or back-button).
 */
const AUTH_ONLY_SEGMENTS = new Set(["login", "forgot-password", "reset-password"]);

function splitLocaleAndPath(pathname: string): { locale: string; segments: string[] } {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && (locales as readonly string[]).includes(segments[0])) {
    return { locale: segments[0], segments: segments.slice(1) };
  }
  // No locale prefix present (e.g. next-intl hasn't redirected to add one
  // yet): don't consume the first segment as if it were a locale, or a
  // protected top segment like `/admin/...` would be missed.
  return { locale: defaultLocale, segments };
}

/**
 * Proxy (formerly `middleware.ts`, renamed in Next.js 16 — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * Proxy runs on the Node.js runtime by default in v16+, so it's safe to
 * call the Admin SDK-backed session verifier directly here, per
 * docs/authentication/README.md.
 *
 * - Delegates locale rewriting/redirects to next-intl for every request.
 * - For requests entering a `(protected)/*` area, verifies the session
 *   cookie (re-checking revocation, same as `getSession()`) and redirects
 *   unauthenticated visitors to the localized `/login` page.
 * - Role-gates each protected top segment against its matching role
 *   (`teacher`, `student`, `admin`): a signed-in user whose role doesn't
 *   match is redirected to their own area rather than the login page —
 *   this is the coarse-grained layer from docs/authorization/README.md;
 *   fine-grained ownership checks (TASK-501's guards) still apply inside
 *   each route/service.
 * - Attaches the resolved `uid`/`role` to the (locale-handled) response as
 *   headers, so downstream code can read them without re-verifying.
 * - For auth-only pages (`login`, `forgot-password`, `reset-password`),
 *   bounces an already-signed-in visitor to their own dashboard instead
 *   of rendering the auth page. Only verifies when a session cookie is
 *   actually present, so anonymous visits stay on the no-verify fast path.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale, segments } = splitLocaleAndPath(pathname);
  const topSegment = segments[0];

  if (topSegment && PROTECTED_SEGMENTS.has(topSegment)) {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionCookieValue(cookie);

    if (!session) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    if (topSegment !== session.role) {
      // Signed in, but this area belongs to a different role (e.g. a
      // student hitting `/teacher/...`) — send them to their own area
      // rather than login, since they *are* authenticated.
      return NextResponse.redirect(new URL(`/${locale}/${session.role}`, request.url));
    }

    const response = intlMiddleware(request);
    response.headers.set("x-user-id", session.uid);
    response.headers.set("x-user-role", session.role);
    return response;
  }

  if (topSegment && AUTH_ONLY_SEGMENTS.has(topSegment)) {
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    // No cookie at all → definitely a visitor, not signed in. Skip the
    // verify call entirely (avoids an Admin SDK round-trip on every
    // anonymous hit to /login, mirroring the "no session" fast path).
    if (cookie) {
      const session = await verifySessionCookieValue(cookie);
      if (session) {
        return NextResponse.redirect(new URL(`/${locale}/${session.role}`, request.url));
      }
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Skip API routes, Next internals, and files with an extension (static assets).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
