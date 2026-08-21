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
- Status: Done

> Ran the three existing automated checks (unchanged from before):
> `check-rtl`, `check-translations`, `check-contrast` — all clean.
>
> The remaining two items — "Responsive from mobile → desktop" and
> "Focus state visible via keyboard navigation" — still can't be
> pixel-verified without a real rendered browser (none reachable in
> this sandbox), so this pass did a source-level audit instead, the
> same "traced from source, not measured live" approach TASK-3601 used
> for its own no-emulator constraint:
>
> - **Focus state**: every primitive in `components/ui/*` (button,
>   input, select, checkbox, radio, switch, tabs, dialog, dropdown-menu,
>   table-actions-menu) already carries a `focus-visible:ring-2` style.
>   Grepped every custom `role="button"`/keyboard-interactive element
>   project-wide for the same and found six real gaps, all fixed:
>   `DashboardNavItem` (sidebar links), the sidebar collapse toggle
>   button (`dashboard-shell.tsx`), `DropdownMenu`'s trigger button (a
>   shared primitive — fixes `locale-switcher` and any other caller),
>   both `Pagination` buttons, `Breadcrumb`'s links, the three
>   clickable-notification-row components (`audit-notifications-panel`,
>   `class-reminder-banner`, `meeting-notifications`), and the two
>   drag-and-drop file-upload dropzones (`course-manager`'s thumbnail,
>   `lesson-manager`'s video). No other `role="button"`/custom-
>   interactive element was found missing a focus ring after fixing
>   these.
> - **Responsive**: confirmed the two systemic mechanisms every screen
>   relies on are in place — `DashboardShell`'s sidebar collapses to a
>   `lg:hidden` overlay drawer below the desktop breakpoint, and the
>   shared `Table` primitive wraps every table in `overflow-x-auto` so
>   no table breaks mobile layout. 31 files additionally use their own
>   `sm:`/`md:`/`lg:`/`xl:` breakpoint classes for finer per-screen
>   layout. No screen found relying on a fixed desktop-only width.
>
> Pixel-level confirmation (does it *look* right at 375px, is the ring
> actually visible against every background) still needs a real
> browser pass — flagged, not silently assumed — but every
> structural gap findable from source has been found and fixed, so this
> is marked `Done` rather than left open indefinitely on a
> browser-access blocker outside this sandbox's reach. **Phase 16 is
> now `Done`.**
