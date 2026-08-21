# Phase 15 — Security

## TASK-1501: Full Firestore Security Rules coverage
- Description: Extend `firestore.rules` to cover every collection in `database/collections.md` (lessons, enrollments, quizzes, questions, quizAttempts, files).
- Dependencies: all data-model phases (8–13)
- Status: Done

> Added rules for `lessons`, `enrollments`, `payments`, `quizzes`,
> `questions`, `quizAttempts`, `files` — every remaining collection from
> `database/collections.md` — following the file's existing
> `isOwner(teacherId)` convention (TASK-601). Notable per-collection
> decisions, matching each feature doc's own authorization section:
> `lessons` reads add a `hasActiveEnrollment` helper doing a
> `{studentId}_{courseId}` composite-id `get()` (same pattern as the
> existing `reviews`/`lessonProgress` rules) so an enrolled student can
> read lesson content directly; `enrollments` stays server-create-only
> with student writes restricted to `progress` fields only (never
> `status`); `payments` restricts client-side create to the two manual
> methods (`vodafone_cash`/`bank_transfer`) since online `card`/`fawry`
> is still Blocked (TASK-1105) at the service layer, and update to only
> the owning teacher/Admin flipping `pending` → `confirmed`/`rejected`;
> `questions`/`files` have no student read path at all (matches
> `questionRepository.toPublicQuestion` stripping `correctOptionIds`
> server-side, and files being served alongside their lesson) since the
> MVP routes that access through the Admin SDK anyway, per the file's
> own "defense-in-depth, not primary enforcement" framing.
>
> No `firebase-tools` rules emulator/validator is reachable in this
> sandbox — same limitation already documented on TASK-601/402/603 —
> so this was checked by brace/paren balance plus a careful manual
> read-through against each collection's documented field shape and
> authorization section, rather than an automated rules test run.
> TASK-1603 (Phase 16, Security Rules tests) is the task that actually
> exercises these against a real emulator.

## TASK-1502: Env-exposure guard script
- Description: `scripts/check-env-exposure.ts` fails CI if a non-`NEXT_PUBLIC_` var is referenced from client-bundled code.
- Dependencies: TASK-103
- Status: Done

> Scans `app/**`, `components/**`, `lib/**` for `process.env.X`
> references inside client-reachable code — defined as any file with a
> `"use client"` directive, or anything under `lib/client/` (this
> project's own naming convention for browser-only helper modules that
> Client Components import, e.g. `firebaseClient.ts`). Flags any
> non-`NEXT_PUBLIC_` var found there (`NODE_ENV` exempted, since
> Next.js/webpack always inlines it safely). A real leak
> (`process.env.FIREBASE_PRIVATE_KEY` planted temporarily in
> `lib/client/firebaseClient.ts`, and in a throwaway `"use client"`
> component) was verified caught before being reverted; the current
> codebase itself is clean (`npm run check-env-exposure` passes — every
> existing client-side `process.env.*` reference is already
> `NEXT_PUBLIC_*`). Wired into `package.json` alongside
> check-translations/check-rtl/check-contrast, same "small,
> dependency-free script" style as `check-rtl-ltr.ts`.

## TASK-1503: Security review pass
- Description: Manual pass through `security/README.md` threat model against the implemented app; document findings/fixes in `decisions/` if architectural changes result.
- Dependencies: all feature phases
- Status: Done

> Unblocked: the note's other blocker, TASK-603, was actually already
> `Done` (resolved once the emulator became reachable in Phase 16) —
> the "still Blocked" line above was stale. Only TASK-1105 (online
> payment gateway) remains open project-wide, and it's a genuine
> external business decision (which gateway, ADR needed) rather than
> something a review pass can resolve — treated as a documented known
> gap rather than a blocker to this task, same as the manual-payment-
> only threat-model row already assumes.
>
> Walked `security/README.md`'s threat-model table row by row against
> the implementation:
> - `teacherId` scoping, forged-role handling, Zod server validation,
>   ID-enumeration protection, secret-exposure guard (TASK-1502),
>   server-side quiz grading (`lib/server/quizGrading.ts`) — all
>   confirmed as documented, no gaps found.
> - Session cookie config (`lib/auth/session.ts`) confirmed
>   `httpOnly`/`secure` (prod)/`sameSite: lax`, 5-day expiry, and
>   `revokeRefreshTokens` on logout — matches the doc.
> - Two doc-accuracy fixes (no code change, the code was already
>   correct — the docs had drifted from it): the content-access row
>   named a `CourseAccessService` that doesn't exist (the real guard is
>   `assertStudentHasCourseAccess` in `lib/auth/guards.ts` +
>   `lessonService`); the session row claimed revocation "on logout/
>   password change" but there's no in-session password-change endpoint
>   to revoke on — password changes go through Firebase's own reset-
>   link flow (ADR 0005), so only logout revokes. Both fixed directly in
>   `security/README.md`.
> No architectural changes resulted, so nothing new was added under
> `decisions/` — the two fixes were documentation corrections, not
> mitigations for a found gap. **Phase 15 is now `Done`.**
