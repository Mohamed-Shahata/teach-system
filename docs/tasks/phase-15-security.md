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
- Status: Blocked

> Phases 6 (TASK-603) and 11 (TASK-1105) each still have a genuinely
> `Blocked` task (no reachable Firestore emulator; no online payment
> gateway integration decided/built yet — see those phases' own notes).
> "All feature phases" isn't fully `Done` while those remain open, so a
> full review pass would either have to skip real gaps or review
> against an incomplete app. Revisit once TASK-603/1105 unblock (an
> emulator becomes reachable / the payment gateway ADR lands).
