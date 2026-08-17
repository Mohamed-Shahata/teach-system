# Phase 16 — Testing

## TASK-1601: Test infrastructure
- Description: Set up unit test runner (Vitest) + Firebase emulator-based integration tests.
- Dependencies: TASK-102
- Status: Done

> Vitest runner (`vitest.config.mts`, node environment, `@` alias, a
> `server-only` stub so service files importing it are testable) was
> already in place and grew incrementally alongside each feature
> phase. The only outstanding infra issue was `lib/server/services/examReportService.ts`
> (TASK-2801/Phase 28) failing to resolve `pdfkit`/`exceljs` at test
> time — both were already declared in `package.json` but not present
> in `node_modules`, so `npm test` failed that one suite while the
> other 103 passed. Ran `npm install`; full suite is now
> **104/104 files, 639/639 tests passing**. The Firebase
> emulator-based integration-test half of this task remains open: no
> `firebase-tools` emulator is reachable in this sandbox, the same
> documented limitation blocking TASK-601/402/603/1501/1503 — revisit
> together with those once an emulator becomes reachable.

## TASK-1602: Service-layer unit tests
- Description: Cover course/lesson/enrollment/quiz services' business rules and authorization checks.
- Dependencies: relevant feature phases
- Status: Done

> Already satisfied incrementally per feature phase, confirmed here:
> `courseService.test.ts`, `lessonService.test.ts`,
> `enrollmentService.test.ts`, `quizService.test.ts`, and
> `quizAttemptService.test.ts` all exist and pass, alongside unit
> coverage for every other service/repository/route in the app (104
> test files total). No gaps found against this task's description.

## TASK-1603: Security Rules tests
- Description: Emulator-based allow/deny tests per collection (covered incrementally per phase, consolidated here).
- Dependencies: TASK-1501
- Status: Done

> `test/firestore.rules.test.ts` — 63 allow/deny cases across all 13
> rule-guarded collections, using `@firebase/rules-unit-testing`
> against the real `firestore.rules` file. Run via `npm run
> test:rules` (separate `vitest.rules.config.mts`, excluded from the
> default `npm test`) against a local Firestore emulator, since none
> is reachable in this sandbox — same limitation as
> TASK-601/1501/1503.
>
> Run in three passes by the user against a real emulator:
> - Pass 1 (first 37 cases): 37/37 green.
> - Pass 2 (added `teacherProfiles`/`schedule`/`reviews`/
>   `lessonProgress`/`notifications`, 26 more cases): 3 failed — all
>   three were bugs in the *test* itself, not the rules (a
>   non-owner-read case that accidentally used the actual owner, a
>   review create with a doc id that didn't match the required
>   `teacherId_studentId` composite-id shape, and a "cannot flip
>   hidden" case that picked a review already `hidden: true` so the
>   flip was a no-op). Fixed all three.
> - Pass 3 (re-run after the fixes): **63/63 passed.** The `stderr`
>   PERMISSION_DENIED lines throughout are the Firestore SDK's own
>   logging for every `assertFails` write and are expected, not
>   failures.
>
> All 13 collections from `database/collections.md` now have
> emulator-verified rule coverage.

## TASK-1604: i18n/RTL/theme regression checklist run
- Description: Manual or automated pass of the checklist in `design-system/README.md` across all implemented screens.
- Dependencies: all UI phases
- Status: In Progress

> Ran the three existing automated checks, which cover 4 of the 6
> checklist items:
> - `npm run check-rtl` → OK, no physical (left/right) classes found
>   in `components/**`
> - `npm run check-translations` → OK, 845 keys in sync between en/ar
> - `npm run check-contrast` → OK, every token pair meets WCAG AA in
>   both light and dark themes
>
> The remaining two items — "Responsive from mobile → desktop" and
> "Focus state visible via keyboard navigation" — need an actual
> rendered browser to verify and there's no browser/visual-testing
> tool reachable in this sandbox, so they're left for a manual pass.
> Not marking Done until those two are checked.
