# Phase 4 — Authentication

> **Scope change (re-scope to Admin + multi-teacher center):** TASK-402
> below (open self-registration) is superseded. The system no longer has
> public sign-up — accounts are created by an Admin or Teacher instead.
> See Phase 6 `TASK-604` (new account-creation endpoints) and `TASK-605`
> (removes the code this task built: `app/[locale]/(public)/register/*`,
> `app/api/auth/register/*`, `components/auth/register-form.tsx`, and
> related tests). TASK-402's status below is left as `Done` for history,
> but its code path is being removed in Phase 6, not carried forward.
> Login, session, logout, password reset, and middleware (TASK-403–406)
> are unaffected and stay as-is.

## TASK-401: Firebase Admin SDK bootstrap
- Description: Implement `lib/server/firebaseAdmin.ts` per `firebase/README.md` (serverless-safe init).
- Goal: Reusable, memoized Admin app instance.
- Dependencies: TASK-104
- Affected modules: `lib/server/firebaseAdmin.ts`, `package.json`
- Acceptance criteria: `adminApp`/`adminAuth`/`adminDb` exported; `getApps().length` guard prevents re-init across warm invocations; throws a clear error if required env vars are missing; module is server-only (`import "server-only"`).
- Testing requirements: unit tests mocking `firebase-admin/app` covering init-once, private-key newline handling, reuse-on-existing-app, and missing-env-var error — see `lib/server/firebaseAdmin.test.ts`.
- Status: Done

## TASK-402: Registration flow (teacher & student)
- Description: Client sign-up form + `/api/auth/register` + `users/{uid}` + `teacherProfiles/{uid}` creation for teachers, per `authentication/README.md`.
- Goal: New users can register with a chosen role.
- Dependencies: TASK-401, TASK-301, TASK-204
- Affected modules: `app/[locale]/(public)/register`, `app/api/auth/register`, `lib/validation/auth.schema.ts`, `lib/client/firebaseClient.ts`, `lib/server/services/authService.ts`, `lib/server/repositories/userRepository.ts`, `lib/server/repositories/teacherProfileRepository.ts`, `lib/errors.ts`, `components/auth/register-form.tsx`
- Acceptance criteria: role is derived and written server-side only (client `role` is intent-only, re-verified via the ID token owner and written once); duplicate registration (existing `users/{uid}`, or a create-race) returns a translated `auth.register.errors.emailInUse` conflict; Firebase Auth account is rolled back (`user.delete()`) if the Firestore profile write fails, so no orphaned Auth-only accounts are left behind.
- Testing requirements: unit test for the service (`lib/server/services/authService.test.ts` — mocks Admin SDK/repositories, covers success for both roles, invalid token, duplicate uid, create-race); integration test against Firebase emulator still outstanding (no emulator available in this environment — see note below).
- Status: Done

> Note: `check-translations` was run to confirm the new `auth.register.*` /
> `errors.*` keys stay in parity between `en.json`/`ar.json`. The Firebase
> emulator integration test from the original testing requirements has not
> been added — running the Firebase emulator suite requires local/CI
> tooling this environment doesn't have. Recommend adding it under Phase 16
> (Testing) or before TASK-403, whichever comes first.

## TASK-403: Login & session cookie
- Description: Login form, `/api/auth/session`, `HttpOnly` session cookie creation.
- Goal: Authenticated session established after login.
- Dependencies: TASK-402
- Affected modules: `app/[locale]/(public)/login`, `app/api/auth/session`, `lib/auth/session.ts`, `components/auth/login-form.tsx`
- Acceptance criteria: session cookie is `HttpOnly`/`SameSite=Lax` (`Secure` in production); `getSession()` re-verifies the cookie (including revocation) on every read and reads `role` from `users/{uid}` rather than trusting the token, since no custom claim is set at registration.
- Testing requirements: unit tests in `lib/auth/session.test.ts` covering cookie exchange, invalid-token rejection, missing/invalid/revoked cookie, missing user doc, and cookie set/clear options.
- Status: Done

## TASK-404: Logout
- Description: `/api/auth/logout` clears cookie and revokes refresh tokens.
- Dependencies: TASK-403
- Affected modules: `app/api/auth/logout/route.ts`, `components/auth/logout-button.tsx`
- Acceptance criteria: clears the session cookie and calls `revokeRefreshTokens(uid)` when a session exists; idempotent — calling it with no/invalid session still returns 200 and clears the cookie rather than erroring.
- Testing requirements: unit tests in `app/api/auth/logout/route.test.ts` (logged-in revoke+clear, idempotent no-session case).
- Status: Done

## TASK-405: Password reset
- Description: Wire Firebase's reset email flow + localized `/reset-password` action handler page.
- Dependencies: TASK-403
- Affected modules: `app/[locale]/(public)/forgot-password`, `app/[locale]/(public)/reset-password`, `components/auth/forgot-password-form.tsx`, `components/auth/reset-password-form.tsx`
- Acceptance criteria: request form always shows the same "sent" confirmation regardless of whether the email is registered (no account enumeration via this flow, per `docs/security/README.md`'s enumeration mitigation); reset-code verification (`verifyPasswordResetCode`) runs before showing the new-password form, with a distinct "invalid/expired link" state; login page links to the request form. Firebase console action URL still needs to be pointed at `/[locale]/reset-password` per `docs/authentication/README.md` — that's a console/infra config step, not code.
- Testing requirements: none of the existing UI components in this codebase have component-level tests (no jsdom/testing-library setup yet — `vitest.config.mts` runs `environment: "node"`); consistent with that, no tests were added for these two client forms. Recommend adding jsdom + Testing Library under Phase 16 (Testing) if UI-level coverage is wanted.
- Status: Done

## TASK-406: Auth middleware & protected routes
- Description: `proxy.ts` (the `middleware.ts` file convention is deprecated as of Next.js 16 — same API, renamed) verifies the session cookie and redirects unauthenticated users out of `(protected)/*` route groups.
- Dependencies: TASK-403
- Affected modules: `proxy.ts`, `lib/auth/session.ts`
- Acceptance criteria: unauthenticated access to any protected route redirects to localized `/login`.
- Status: Done

> Note: `(protected)` route groups don't appear in the URL, so protected
> areas are matched by their top-level path segment (`teacher`, `student`,
> `admin` — see `architecture/folder-structure.md`) rather than by group
> name. Role-based gating of those segments (a student hitting
> `/teacher/*`) is TASK-501 in Phase 5, not this task. `proxy.ts` runs on
> the Node.js runtime by default in Next.js 16+, so calling the Admin
> SDK-backed session verifier directly in it is safe (no Edge-runtime
> restriction). The resolved `uid`/`role` are also stamped onto the
> response as `x-user-id`/`x-user-role` headers for downstream use.
