# Phase 4 — Authentication

## TASK-401: Firebase Admin SDK bootstrap
- Description: Implement `lib/server/firebaseAdmin.ts` per `firebase/README.md` (serverless-safe init).
- Goal: Reusable, memoized Admin app instance.
- Dependencies: TASK-104
- Status: Not Started

## TASK-402: Registration flow (teacher & student)
- Description: Client sign-up form + `/api/auth/register` + `users/{uid}` + `teacherProfiles/{uid}` creation for teachers, per `authentication/README.md`.
- Goal: New users can register with a chosen role.
- Dependencies: TASK-401, TASK-301, TASK-204
- Affected modules: `app/[locale]/(public)/register`, `app/api/auth/register`, `lib/validation/auth.schema.ts`
- Acceptance criteria: role is set server-side only; duplicate email handled with a translated error.
- Testing requirements: unit test for the service; integration test against Firebase emulator
- Status: Not Started

## TASK-403: Login & session cookie
- Description: Login form, `/api/auth/session`, `HttpOnly` session cookie creation.
- Goal: Authenticated session established after login.
- Dependencies: TASK-402
- Status: Not Started

## TASK-404: Logout
- Description: `/api/auth/logout` clears cookie and revokes refresh tokens.
- Dependencies: TASK-403
- Status: Not Started

## TASK-405: Password reset
- Description: Wire Firebase's reset email flow + localized `/reset-password` action handler page.
- Dependencies: TASK-403
- Status: Not Started

## TASK-406: Auth middleware & protected routes
- Description: `middleware.ts` verifies session cookie, redirects unauthenticated users, gates `(protected)/*` route groups by role.
- Dependencies: TASK-403
- Affected modules: `middleware.ts`, `lib/auth/session.ts`
- Acceptance criteria: unauthenticated access to any protected route redirects to localized `/login`.
- Status: Not Started
