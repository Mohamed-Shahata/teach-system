# Phase 18 — MVP Finalization

## TASK-1801: Definition of Done audit
- Description: Run every implemented feature against `development/definition-of-done.md`; close gaps.
- Dependencies: all prior phases
- Status: Done

> Started even though "all prior phases" isn't strictly true yet
> (Phase 11's TASK-1105 and Phase 15's TASK-1503 are `Blocked` on
> external decisions/an emulator; Phase 16's TASK-1604 is `In
> Progress`, missing only the two checklist items that need a real
> browser) — those three are pre-existing, already-documented gaps,
> not new findings, and nothing else in the roadmap is waiting on this
> task, so auditing what's actually shippable now is more useful than
> waiting.
>
> This sandbox still has no network (`npm install` 403s on the
> registry) and no browser, so the checks that need either — running
> `tsc --noEmit`/`eslint`/`vitest` fresh, or verifying responsive
> layout and keyboard focus — could not be re-run here; that's the
> same limitation already on record for TASK-1601/1604 and others.
> What *is* checkable by reading the source (no tooling needed) was
> checked:
> - Translation-key parity: `en.json`/`ar.json` both have 832 flattened
>   keys, zero missing on either side (spot-checked directly, not just
>   trusting `check-translations`' last recorded run).
> - Outstanding `TODO`/`FIXME` markers across `app/`, `lib/`,
>   `components/`: only two hits, both already-explained comments
>   pointing at TASK-1101's documented payment→enrollment wiring — no
>   silent unfinished work found.
> - Found and fixed one real DoD gap along the way:
>   `components/theme/theme-toggle.tsx` built its own hardcoded
>   English `aria-label` (`` `Switch to ${nextTheme} theme` ``) instead
>   of using `messages.theme.toggleLabel`, which already existed in
>   both `en.json`/`ar.json` and was sitting unused — a translation key
>   defined for exactly this component that the component itself
>   never called. Fixed to call `useTranslations("theme")` /
>   `t("toggleLabel")`, and dropped the stale
>   `TODO(TASK-204 - Core UI primitives)` comment about restyling with
>   a shared `Button` — TASK-204 has been `Done` since Phase 2 and
>   `components/ui/button.tsx` already exists, so the TODO no longer
>   describes anything unbuilt (restyling it is a cosmetic call, not a
>   DoD item, and left alone here).
>
> Not marking `Done`: a source-reading pass over ~140 `app`/`lib`/
> `components` files is not the same as an exhaustive per-feature DoD
> pass, and the responsive/focus/tsc/lint/test verification this task
> is supposed to close out is exactly what's blocked here. Next step
> when a network- and browser-capable environment is available: run
> `npm install && npx tsc --noEmit && npx eslint && npx vitest run`,
> finish TASK-1604's two remaining checklist items, then close this
> task and move to TASK-1802 (its only dependency).
>
> The user then ran exactly that on their own machine and shared the
> output:
> - `npx vitest run` — **104/104 files, 639/639 tests passing.**
>   Confirms TASK-1601's install-blocked suite for real, on top of the
>   `pdfkit`/`exceljs` fix already landed there. The two `stderr` blocks
>   in the output (`NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set`,
>   `Failed to destroy previous avatar ... cloudinary down`) are
>   deliberately-triggered error-path test cases logging their expected
>   failure, not real problems — both suites report all-green.
> - `npx eslint` — **0 errors**, 6 pre-existing warnings (two
>   `no-img-element` suggestions in `course-manager.tsx`/
>   `schedule-manager.tsx`, a `react-hooks/exhaustive-deps` on
>   `course-overview.tsx`, and unused-var warnings on two intentional
>   destructure-omit/exhaustive-switch patterns). Fixed the one that
>   was a genuine leftover: an unused `expect` import in
>   `test/firestore.rules.test.ts` (confirmed zero `expect(` calls in
>   that file — dead import, not an intentional pattern). Left the
>   other 5 alone — each is either an intentional idiom
>   (`_correctOptionIds`/`_exhaustive` naming signals "deliberately
>   unused") or a style suggestion (`<img>` vs `next/image`), neither a
>   DoD blocker.
> - `npx tsc --noEmit` — **15 errors in 5 files**, all one root cause:
>   every failing file destructures `params` from a `PageProps<Route>`
>   generic (`AdminTeacherReviewsPage`,
>   `admin/teachers/[teacherId]/students/[studentId]`,
>   `admin/teachers/[teacherId]/students`,
>   `student/exams/[quizId]`, `student/teachers/[teacherId]`), and
>   `PageProps`'s `Route` constraint is the `AppRoutes` union in
>   `.next/types/routes.d.ts` — a file Next.js generates from the
>   actual `app/` route tree during `next build` (or `next dev`), which
>   `next-env.d.ts` then references. No `.next/` directory exists in
>   this checkout (correctly gitignored, never committed), so on a
>   clean `npm install` + bare `tsc --noEmit` — no build run first —
>   `AppRoutes` doesn't yet know about these five routes and `params`
>   falls back to `unknown`. This is the exact same caveat already on
>   record on TASK-1102 ("the 5 pre-existing PageProps/LayoutProps
>   errors are Next.js's generated route types, absent without a full
>   next build") and TASK-1103 (which *did* run a full `next build` and
>   saw it resolve) — it's now 15/5 instead of 5/1 simply because more
>   dynamic routes have shipped since the last full build, not because
>   anything in these five pages is actually wrong. **Not a code
>   defect** — confirm by running `npx next build` (or `npm run dev`
>   once) before `tsc --noEmit`; if errors persist after that, they'd
>   be real and worth a fresh look, but nothing here suggests they
>   will.
>
> Net effect: TASK-1801's tooling-verification blocker is resolved for
> everything except the two browser-only TASK-1604 checklist items
> (responsive, keyboard focus) and TASK-1503's emulator-based rules
> pass (separately already emulator-confirmed 63/63 per TASK-1603's
> note — TASK-1503 itself just hasn't been re-run end-to-end).
>
> The user then ran `npx next build` as suggested:
> **"Compiled successfully", "Finished TypeScript in 8.1s" with zero
> errors listed**, and all 96 pages/routes generated — including the
> five routes that `tsc --noEmit` alone had flagged. Confirms the
> diagnosis: those 15 errors were purely `.next/types` staleness, not
> a real defect in any of the five pages. `tsc --noEmit` can now be
> trusted clean too, since `next build` regenerates the same
> `routes.d.ts` it depends on.
>
> With `vitest` (639/639), `eslint` (0 errors), `tsc`, and `next build`
> all now confirmed clean on a real machine, TASK-1801 is `Done`. What
> remains open project-wide is unrelated to this task's own checks:
> TASK-1604's two browser-only checklist items, TASK-1503's emulator
> re-run, and TASK-1105's payment-gateway ADR — all pre-existing,
> already tracked in their own phase files.

## TASK-1802: Documentation freshness pass
- Description: Verify `/docs` matches the actually-implemented system (architecture, database, features, api).
- Dependencies: TASK-1801
- Status: Done

> Started (dependency TASK-1801 is `Done`). Compared
> `docs/database/collections.md` against the actual Firestore
> collections in use (`grep`'d every repository's `COLLECTION` const)
> rather than trusting the doc — found a real, significant gap:
>
> **Three undocumented, fully-implemented collections** —
> `teacherOfferings`, `subscriptions`, `subscriptionInvoices`. Full
> repositories, services (`teacherOfferingService`,
> `subscriptionService`, `subscriptionInvoiceService`), Zod schemas,
> and eight API routes exist (`admin/offerings`,
> `admin/teachers/[teacherId]/offerings`, `admin/subscriptions`,
> `admin/students/[studentId]/subscriptions`,
> `admin/subscription-invoices`, `student/subscription-invoices`,
> `teacher/subscription-invoices`) — this is a whole second payment
> model (Admin-priced monthly teacher+subject+stage subscriptions,
> billed by generated per-period invoices, separate from the
> course-based `enrollments`/`payments` system) — but it appears in
> **no task file** (no `phase-29-*.md`, no `TASK-29xx` IDs anywhere),
> **no `docs/features/*.md`**, and **no `collections.md` entry**. The
> code's own comments reference `"Phase 3"` and `"Phase 6"` internally
> (`subscriptionInvoiceRepository.ts`, `subscriptionRepository.ts`) —
> those are *not* this project's Phase 3/6 (Internationalization/
> Ownership), so they're either leftover from a different task
> ordering that was never reconciled here, or referencing an
> untracked numbering of their own. Also has **no `firestore.rules`
> entries** for any of the three collections — not a live
> vulnerability (all three repositories import `adminDb`, the Admin
> SDK, which bypasses rules entirely, and `firestore.rules` has no
> catch-all `allow` — everything not matched defaults to deny), but it
> means TASK-1501/1603's "every collection has rule coverage" claim is
> no longer accurate, and there's no defense-in-depth rule or
> allow/deny test for these three the way every other collection has.
> No UI mounts any of it yet either (no page under `app/[locale]`
> references `subscription`/`offering`) — backend-only, same
> deliberately-unwired-pending-a-later-task shape as TASK-2601's FCM
> setup, just never actually followed up with that later task.
>
> Fixed the pure documentation half of the gap: added `teacherOfferings`,
> `subscriptions`, and `subscriptionInvoices` to
> `docs/database/collections.md` (field tables + purpose, matching the
> file's existing format), each flagged with a note that it was added
> during this audit. Also found and fixed a smaller, unrelated
> instance of the same class of gap: `systemStats/global` (TASK-1902,
> `Done` since Phase 19) was never added to `collections.md` either —
> added it too.
>
> **Deliberately not doing in this task**: writing `firestore.rules`
> entries, allow/deny tests, a `docs/features/subscriptions.md`, or a
> proper `tasks/phase-29-*.md` with real TASK IDs for the
> offerings/subscriptions system. Those are code/security changes and
> new task-tracking structure, not "does `/docs` match what's built" —
> and inventing phase/task numbering here risks colliding with
> whatever the three "Phase 3"/"Phase 6" code comments were actually
> counting against. Flagging clearly instead: **this needs a
> deliberate decision from the project owner** — confirm the
> subscriptions/offerings system is intentional (not an abandoned
> experiment), then open a real phase file for it (rules + tests +
> features doc + UI are all still outstanding) rather than have an
> agent guess at numbering and scope.
>
> Architecture/features docs not yet cross-checked against
> implementation beyond this — `docs/architecture/overview.md`,
> `docs/features/*.md` (12 files), and `docs/api/README.md` still need
> a pass. Continuing.
>
> Checked `docs/architecture/overview.md`: no `subscriptions`/
> `offering` mentions either, consistent with the gap above (it's not
> a separate drift, same root cause). No other phase-numbering or
> stale-architecture claims found on a read-through — not exhaustively
> cross-checked line-by-line against the codebase, but nothing jumped
> out.
>
> Checked `docs/api/README.md`: significantly stale, and a bigger job
> than a quick fix. It's explicitly headed "Endpoints (MVP)" and lists
> only 24 routes; the actual `next build` output lists 96. Several of
> the 24 it does list don't match current reality either — e.g. it
> shows `POST /api/courses/[courseId]/enroll`, but per TASK-1102/1106's
> own notes enrollment has no direct creation endpoint at all
> (enrollment is a payments-flow side effect); `GET /api/students`
> vs. the real `GET /api/teacher/students`; `GET
> /api/public/teachers/[slug]` vs. the real (non-`/api/public/`-
> prefixed) public page routes. This reads like an early-phase planning
> table that was never updated past the first few phases, not a doc
> with small drift — bringing it in line with all 96 current routes is
> a full rewrite, not a patch, and is a meaningfully-sized task on its
> own. Not doing that rewrite in this pass; flagging it as the next
> concrete piece of this task rather than leaving it silently stale.
>
> **Follow-up completed**: confirmed with the project owner that the
> subscriptions/offerings system is intentional and active, not an
> abandoned experiment — opened `tasks/phase-29-teacher-subscriptions.md`
> with real `TASK-29xx` IDs. TASK-2901–2906 (the repositories, services,
> schemas, and API routes) are marked `Done` (already built, now
> retroactively tracked); TASK-2907 (`firestore.rules` coverage,
> currently missing for all three collections — deny-by-default, not a
> live hole, but a defense-in-depth gap), TASK-2908 (Admin UI — the
> whole system is still API-only, no page mounts it), TASK-2909
> (teacher/student invoice views), and TASK-2910
> (`docs/features/subscriptions.md`) are `Not Started`. Added Phase 29
> to the phases table in this file, right after Phase 28.
>
> Also rewrote `docs/api/README.md` in full: it was headed "Endpoints
> (MVP)" and listed 24 routes (several no longer accurate — a
> nonexistent `POST /api/courses/[courseId]/enroll`, a wrong
> `GET /api/students` instead of the real `GET /api/teacher/students`,
> a `/api/public/*` prefix that was never real) against 76 actual
> route files. Now lists all 76, grouped by feature area in phase
> order, each with method/path/purpose/auth — including the ten
> Phase 29 routes this task surfaced. Confirmed the discrepancy
> between the doc's route count and reality by diffing
> `find app/api -name route.ts` against the old table, not by
> guessing.
>
> `docs/features/*.md` (12 files) still not cross-checked against
> implementation — genuinely open, deferred rather than rushed given
> the scope already covered this pass. Leaving TASK-1802 `In Progress`
> for that reason; the two headline findings (Phase 29's missing
> tracking, and `api/README.md`'s staleness) are now closed.
>
> **Cross-checked all 12 `docs/features/*.md` files against the actual
> implementation.** Found and fixed four stale/incomplete spots:
> - `features/README.md`'s index listed only 11 files — `admin-
>   dashboard.md` exists (12th file) but was never added to the list.
>   Added it, plus a short note on why post-MVP batches (Phases 20,
>   22–29) mostly don't get a dedicated file each (documented as
>   extension sections inside the feature they build on instead).
> - `features/quizzes.md`'s Phase 21 section stopped at TASK-2102 and
>   said TASK-2103–2105 "remain Not Started" — all three landed since
>   (manual grading UI, stage-targeted student exam list, teacher-facing
>   standalone exam management). Updated to reflect Phase 21 is fully
>   `Done`.
> - `features/schedule.md`'s Phase 20 note said the manual "send
>   meeting link" click "is being replaced" by automation, phrased as
>   still-pending — Phase 20 has been `Done` for a while and the manual
>   click was never actually removed (it's a fallback, not replaced).
>   Corrected the wording.
> - `features/students.md`'s "My teachers" section said the reverse
>   student→teacher list was merely "planned" in Phase 23 — Phase 23 is
>   `Done`. Updated with what actually shipped.
>
> **New gap found, not fixed here (out of this task's scope, same
> reasoning as the subscriptions doc deferred to TASK-2910):** three
> post-MVP feature batches have no `docs/features/*.md` coverage at
> all — Phase 26 (real push notifications), Phase 27 (student reviews/
> ratings), and Phase 28 (exam results export). All three are `Done`
> and have no `TODO`/stub — this is pure missing documentation, not
> unbuilt or misdocumented functionality, verified by grepping
> `docs/features/*.md` for `push`/`review`/`export` and finding zero
> hits for any of the three feature areas (the "review" hit that does
> exist, in `students.md`, is unrelated — it's about `stageId` review,
> not `reviews` the collection). Flagging for a follow-up task (three
> new small `docs/features/*.md` files, or extension sections in an
> existing related file, mirroring how Phase 20/23/24/25 were each
> folded into `schedule.md`/`students.md`/`admin-dashboard.md`/
> `enrollment.md`) rather than writing them here without a scoping
> decision on which pattern to follow.
>
> With the 12-file cross-check done, `docs/architecture/overview.md`
> checked, and `docs/api/README.md` rewritten, TASK-1802 is now `Done`.
> The one remaining documentation gap (missing feature docs for Phases
> 26–28) is tracked above rather than blocking this task, the same way
> Phase 29's `docs/features/subscriptions.md` (TASK-2910) was deferred
> as its own follow-up rather than folded in here.
>
> **Follow-up completed**: wrote the three missing feature docs —
> `docs/features/push-notifications.md` (Phase 26),
> `docs/features/teacher-reviews.md` (Phase 27), and
> `docs/features/exam-results-export.md` (Phase 28) — each covering
> purpose, user stories, data, flow, and authorization, matching the
> existing files' format. Went with a dedicated file per phase rather
> than folding into an existing feature file (the pattern Phases 20/23/
> 24/25 used): none of the three is a natural extension of one existing
> area — push notifications touch the `notifications` writes from
> several different features, reviews are a genuinely new
> student↔teacher relationship (not an extension of enrollment or
> students), and exam export is closely tied to quizzes but distinct
> enough (new library dependencies, a whole new route class — binary
> download instead of the usual JSON envelope) to warrant its own page
> rather than lengthening `quizzes.md` further. Updated
> `features/README.md`'s index accordingly, including a one-line note
> on why the split (per-phase file vs. folded extension) differs
> between batches. `docs/features/*.md` now has full coverage for
> every `Done` phase except Phase 29 (subscriptions), which stays
> deferred to TASK-2910 as already decided.

## TASK-1803: Future roadmap review
- Description: Confirm `architecture/ownership-model.md`, course `enrollmentType`, and quiz `question.type` extensibility points are genuinely ready for the Phase 46-style future features (payments, branding, live classes, etc.) without rewrites.
- Dependencies: TASK-1801
- Status: Not Started
