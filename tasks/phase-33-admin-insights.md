# Phase 33 — Admin Overview, Analytics & Reporting

> Third post-MVP feature batch (user request, this session). Extends
> Phase 19's admin dashboard/`systemStats` and Phase 24's oversight
> enhancements rather than replacing them.

## TASK-3301: Overview page — actionable summary cards
- Description: The Admin overview page's cards get richer: alongside existing totals (Phase 19), add "recently joined students" (last N by `createdAt`) and "recent payments" (last N `payments`/`subscriptionInvoices` by `createdAt`, across both payment models) as scannable mini-lists, not just count cards.
- Dependencies: Phase 19 (`systemStats`, overview page), Phase 11 (`payments`), Phase 29 (`subscriptionInvoices`)
- Affected modules: `app/api/admin/overview/route.ts` (extend), `components/admin/*overview*`
- Acceptance criteria: overview shows a "recent students" list and a "recent payments" list (merging both payment models, sorted by recency), each linking to the relevant detail page (TASK-3305/3306).
- Testing requirements: API test for the merged/sorted recent-payments query; component test for card rendering.
- Documentation requirements: `docs/features/admin-dashboard.md` (or Phase 19's doc) updated.
- Status: Done — new `adminOverviewService.getRecentActivity(session)`
  reuses two already center-wide, already Admin-allowed reads rather
  than adding new repository queries: `paymentService.listForTeacher`
  and `subscriptionInvoiceService.listForTeacher` (both already unscope
  to every teacher for an `admin` session, via `scopeToTeacher`'s
  existing admin bypass) — merged into one recency-sorted, capped-at-5
  `recentPayments` list tagged with a `source: "payment" |
  "subscriptionInvoice"` so the Admin page can tell which model each row
  came from without a second lookup. `recentStudents` is
  `userRepository.listByRole("student")` sorted by `createdAt` and
  capped at 5 the same way. No new API route was added — `admin/
  dashboard/page.tsx` is a server component that already calls
  `systemStatsService.getStats`/`notificationService
  .listMyAuditNotifications` directly (no `app/api/admin/overview/
  route.ts` exists, and none of Phase 19's stats cards go through one
  either), so `getRecentActivity` is called the same way rather than
  introducing the API layer the task's "Affected modules" note assumed.
  Both new lists render as clickable rows on the existing overview page,
  right above the audit notifications panel: a student row links to
  `admin/students/[uid]` (TASK-3307's new account page); a payment row
  links to the same page for that payment's `studentId`, since neither
  payment model has its own detail page and the student account page
  already surfaces full payment history (TASK-3307) — the acceptance
  criteria's "TASK-3305/3306" pointer reads as a stale reference (3305
  is the Excel export task, not a detail page; 3306/3307 are the actual
  detail-page tasks), so this follows what those two tasks actually
  built instead. New translations under `adminDashboard.recentActivity`
  in both `messages/en.json`/`messages/ar.json` (parity checked by hand,
  1076/1076 keys match). Testing: `adminOverviewService.test.ts` — role
  gating, the students cap/sort, and the merged-and-capped payments sort
  (including that a `subscriptionInvoice` row sorts correctly alongside
  `payment` rows). Verification could not run for real this session (no
  network in this sandbox — `npm install` 403s, `node_modules` was never
  installed) — reviewed by hand instead, same constraint every recent
  session in this phase file has hit. Phase 33 stays `In Progress`:
  TASK-3302 (Analytics — monthly revenue breakdown) is next — its
  dependencies (Phase 19's existing analytics, Phase 11, Phase 29) are
  all satisfied; TASK-3303/3304/3305 remain `Not Started` and form the
  rest of the analytics chain (3304/3305 depend on 3302/3303).

## TASK-3302: Analytics — monthly revenue breakdown
- Description: A revenue chart combining confirmed `payments` and confirmed `subscriptionInvoices`, grouped by month, with the filter from TASK-3304 applied.
- Dependencies: Phase 19 (`analyticsRepository`), Phase 29 (`subscriptionInvoices`)
- Affected modules: `lib/server/repositories/analyticsRepository.ts`, admin analytics page/components
- Acceptance criteria: chart reflects real confirmed revenue across both payment models for the selected range.
- Testing requirements: repository unit test for the aggregation query.
- Documentation requirements: analytics doc (TASK-3304 covers the shared doc update).
- Status: Done — `analyticsRepository.monthlyRevenue` now combines both payment models instead of subscription invoices alone: confirmed `subscriptionInvoices` (bucketed by their own `period` field, unchanged) plus one-off `payments` in a terminal successful status (`succeeded` or `confirmed` — `paymentService`'s existing state machine), bucketed by `createdAt` since a payment has no separate billing period. `totalConfirmedRevenue` (the Analytics page's headline card) got the same combination so it never disagrees with the chart it sits above. No new repository methods or route/service changes needed — `analyticsService.getOverview` already calls both functions, so `AdminAnalyticsOverview`'s existing revenue chart and total-revenue card pick this up with no component changes. New `analyticsRepository.test.ts` (didn't exist before this task) covers: invoice+payment amounts landing in the same monthly bucket, a non-terminal payment status (`pending`) and an out-of-window record being excluded, and the all-time `totalConfirmedRevenue` sum. Full verification run for real this session (network available): `npm install`, `npx vitest run` (114 files / 786 tests passing, up from 765), `npx eslint` on the changed files (0 errors), `npx tsc --noEmit` has the same pre-existing, unrelated failures noted in prior sessions (missing generated `PageProps`/`LayoutProps` Next.js types, and a couple of pre-existing type mismatches in `teacher-account-view.tsx`) — nothing in any file this task touched. No translation keys or UI text changed, so `check-translations`/`check-rtl`/`check-contrast` don't apply here. Phase 33 stays `In Progress`: TASK-3303 (teacher/subject/stage breakdowns) is next — its dependencies (Phase 19, Phase 29) are satisfied; TASK-3304 depends on both 3302 (now done) and 3303.

## TASK-3303: Analytics — teacher/subject/stage breakdowns
- Description: Three new analytics views: (a) teachers ranked by total active students, (b) subjects ranked by total active students, (c) student count per education stage. All reuse existing `enrollments`/`subscriptions` data, aggregated server-side.
- Dependencies: Phase 19, Phase 29
- Affected modules: `lib/server/repositories/analyticsRepository.ts`, admin analytics UI
- Acceptance criteria: three new chart/table sections, each correctly ranked/grouped and matching a manual count against seed data.
- Testing requirements: repository unit tests for each of the three aggregations.
- Documentation requirements: analytics doc.
- Status: Done — three new `analyticsRepository` methods, all unioning active enrollments + active subscriptions the same way `monthlyRevenue`/`totalConfirmedRevenue` union payment models, keeping a student counted once per grouping even with both an enrollment and a subscription. `activeStudentCountsByTeacher` groups by the `teacherId` already on both doc types. `activeStudentCountsBySubject` does the same for `subjectId`, resolving each enrollment's subject via a batch `courses` lookup (subscriptions already carry `subjectId` directly). `activeStudentIds` returns the raw distinct-id set for the stage view, since `stageId` lives on the student's own `users` doc, not on an enrollment/subscription — the service layer (`analyticsService.getOverview`) joins that via `userRepository.findByIds` and groups by stage, sorted by the stage's own `order` (not by count, for a natural grade-level reading order) rather than the teacher/subject lists' descending-count ranking. Name joins also happen in the service: `teacherProfileRepository.findByIds` for teacher display names, `subjectRepository.list()`/`educationStageRepository.list()` for bilingual subject/stage names — matching this repo's existing service-layer-joins convention (see TASK-3205's `studentScheduleService`). New `AnalyticsOverview` fields (`teacherBreakdown`, `subjectBreakdown`, `stageBreakdown`) render as three ranked list cards below the existing charts in `AdminAnalyticsOverview`, reusing the same `locale === "ar" ? ... : ...` bilingual-name pattern as `course-overview.tsx`/`teacher-manager.tsx`. New translations under `adminDashboard.analytics.breakdowns` in both `messages/en.json`/`messages/ar.json`. No new API route or documentation file beyond this task note — `GET /api/admin/analytics` and the server page already call `analyticsService.getOverview`, so both pick up the new fields automatically. Full verification run for real this session (network available): `npm install`, `npx vitest run` (114 files / 791 tests passing, up from 786 — 5 new tests across the three aggregations), `npx eslint` on changed files (0 errors, 2 expected `messages/*.json` "no matching configuration" warnings), `npx tsc --noEmit` and `check-translations` (1093 keys in sync)/`check-rtl`/`check-contrast` all pass or show only the same pre-existing, unrelated failures noted in prior sessions. `npx next build`'s TypeScript pass fails on a **pre-existing** `teacher-account-view.tsx` type mismatch between two different modules' `LocalizedText` interfaces (`teacherProfileRepository`'s optional `en`/`ar` vs `subjectRepository`'s required ones) — introduced before this task, unrelated to anything TASK-3303 touched, and not fixed here to stay in scope; flagging it as the next quick cleanup item. Phase 33 stays `In Progress`: TASK-3304 (universal date-range filter) is next — both its dependencies (TASK-3302, TASK-3303) are now `Done`.

## TASK-3304: Analytics — universal date-range filter (month / year / 5-year)
- Description: A single filter control (month, year, or 5-year window) that applies to every chart on the analytics page — TASK-3302, TASK-3303, and the existing Phase 19 charts (revenue growth, subscription growth, etc.) all read from the same selected range instead of each having independent filters.
- Dependencies: TASK-3302, TASK-3303, Phase 19's existing charts
- Affected modules: shared analytics filter state/component, `lib/server/repositories/analyticsRepository.ts` (range parameter threaded through every query)
- Acceptance criteria: changing the filter re-renders every chart on the page consistently; the three preset granularities (month/year/5-year) all produce correct bucket boundaries.
- Testing requirements: repository tests per granularity; a UI test confirming the filter drives every chart, not just one.
- Documentation requirements: analytics doc gets a "filtering" section.
- Status: Done — `analyticsRepository.buildRange(granularity)` resolves one `AnalyticsRange` (`{ since, until, bucketKeys }`) for the three preset granularities: `month` (one bucket per day of the current calendar month), `year` (12 monthly buckets across the current year), `5year` (5 yearly buckets, current year + 4 prior) — threaded through every ranged repository method (`monthlyRevenue`, `monthlySubscriptionGrowth`, and TASK-3303's three breakdown methods, all of which gained a required `range` parameter). `monthlyRevenue`'s invoice side buckets by a new `invoiceBucketKey(period, granularity)` helper (a `YYYY-MM` invoice period has no day-level data, so under `month` granularity its amount lands on that month's first day); the payment side and `monthlySubscriptionGrowth` bucket by `createdAt` via a granularity-aware `periodOf`. `totalConfirmedRevenue`/`activeSubscriptionCount`/`pendingInvoiceCount` stay all-time/unranged (the headline figures, unchanged from TASK-3301/3302). `analyticsService.getOverview(session, granularity = "year")` builds the range once and passes it to every repository call, and returns the resolved `granularity` on `AnalyticsOverview` so the UI's filter control stays in sync with what it's showing. `GET /api/admin/analytics?granularity=month|year|5year` validates via new `lib/validation/analytics.schema.ts` (`analyticsGranularitySchema`, same enum-then-parse pattern as `paymentStatusSchema`), defaulting to the service's own default when omitted. `AdminAnalyticsOverview` gets a three-way toggle in the page header (`filters.granularity.{month,year,5year}`, `filters.rangeLabel` — new `messages/en.json`/`messages/ar.json` keys, 1097 keys in sync) that refetches with the chosen granularity; both charts' axis labels now derive from the bucket key's own shape (`YYYY-MM-DD`/`YYYY-MM`/`YYYY`) via a renamed `bucketLabel` helper (was `monthLabel`) instead of assuming monthly. Documentation: this file's own status line plus a new "Analytics (Phase 33)" + "Filtering (TASK-3304)" section in `docs/features/admin-dashboard.md` (the doc TASK-3301 already pointed at). Testing: `analyticsRepository.test.ts` gets `buildRange` coverage for all three granularities (bucket-key shape and since/until boundaries) plus `monthlyRevenue` cases per granularity (day/month/year bucketing, including the invoice-period edge case) and the pre-existing breakdown tests updated to pass a `range` argument; no UI test for the filter driving every chart (no component-test harness exists yet in this repo — same gap noted implicitly by every other component in this codebase having no `.test.tsx`). Full verification run for real this session (network available): `npm install`, `npx vitest run` (114 files / 797 tests passing, up from 791), `npx eslint` on every changed file (0 errors), `npx tsc --noEmit` and `npx next build` both show only the same pre-existing `teacher-account-view.tsx`/`PageProps` failures flagged in TASK-3303's note — nothing in any file this task touched. `check-translations` passes (1097 keys). Phase 33 stays `In Progress`: TASK-3305 (Excel export) is next — its dependencies (3302, 3303, 3304) are all now `Done`.
- Description: An "Export to Excel" action on the analytics page producing a `.xlsx` (the project already depends on `exceljs` per `package.json`) covering the currently-filtered (TASK-3304) data: revenue, enrollments, teacher/subject/stage breakdowns.
- Dependencies: TASK-3302, TASK-3303, TASK-3304
- Affected modules: `app/api/admin/analytics/export/route.ts` (new), reuses `exceljs` the way Phase 28's exam-results export does (`docs/features/exam-results-export.md` as a pattern reference)
- Acceptance criteria: exported workbook's numbers match what's on-screen for the same filter selection; each breakdown gets its own sheet.
- Testing requirements: route test asserting workbook structure/sheet names and a spot-check of computed values.
- Documentation requirements: `docs/features/exam-results-export.md`-style new doc, or extend it to cover both exports.
- Status: Done — `analyticsExportService.getOverview` calls the exact
  same `analyticsService.getOverview` the on-screen
  `GET /api/admin/analytics` route calls (no second query path, so
  exported numbers can never drift from what TASK-3304's filter shows
  on-screen), then `renderXlsx` writes six sheets — `Summary`, `Revenue`,
  `Subscription Growth`, `Teachers`, `Subjects`, `Stages` — mirroring the
  page's cards/charts/breakdowns one-to-one. New
  `app/api/admin/analytics/export/route.ts` (`GET
  ?granularity=month|year|5year`) reuses the same
  `Content-Disposition: attachment` file-download shape as
  `app/api/exams/[examId]/export/route.ts` (TASK-2802/2803) rather than
  the JSON-envelope pattern the rest of `app/api/*` uses. An "Export to
  Excel" link was added next to `AdminAnalyticsOverview`'s existing
  Refresh button, pointing at the route with the page's current
  `granularity` so the download always matches what's on screen. New
  translations: `adminDashboard.analytics.export` in both
  `messages/en.json`/`messages/ar.json` (parity checked: 1085/1085 keys
  match). Documentation: `docs/features/admin-dashboard.md` gets a new
  "Excel export (TASK-3305)" section under its existing Analytics
  section (extending, per this task's own documentation note, rather
  than a new file). Testing: `app/api/admin/analytics/export/route.test.ts`
  — resolved-granularity happy path, the default (`undefined`) case, and
  an invalid-granularity 400. Full verification ran for real this session
  (network available): `npm install`, `npx vitest run` (115 files / 800
  tests passing, up from 797), `npx eslint` on changed files (0 errors),
  `npx next build` (Turbopack compiled successfully) with `tsc` showing
  only the same pre-existing, unrelated `teacher-account-view.tsx` type
  mismatch flagged in TASK-3303/3304's notes. Phase 33 stays
  `In Progress`: TASK-3306/3307 were already `Done` before this session;
  the phase has no remaining `Not Started` tasks, so all seven of
  TASK-3301–3307 are now `Done` — the phase moves to `Done`.

## TASK-3306: Admin can open a course and view its content
- Description: From the Admin courses list, clicking a course opens a read-only view of its full content (lessons, videos, files, linked exam) — reusing the same course-detail rendering built for TASK-3104's teacher preview, in a read-only Admin context.
- Dependencies: TASK-3104 (shared rendering component)
- Affected modules: `app/[locale]/(protected)/admin/courses/[courseId]/page.tsx` (new), `components/admin/*`
- Acceptance criteria: Admin can view any course's full lesson/content structure regardless of enrollment; no edit controls are exposed in this view (editing stays on the existing teacher-facing editor, opened separately if the Admin needs to edit).
- Testing requirements: authorization test (Admin-only route); rendering test reusing TASK-3104's component.
- Documentation requirements: `docs/features/courses.md`.
- Status: Done — reuses two *already-admin-allowed* reads rather than adding new ones: `courseService.getCourseForStudent` and `lessonService.listLessonsForCourseDetail` (both `assertRole(session, "student", "admin")`, and `listLessonsForCourseDetail`'s `hasAccess` already had an explicit `session.role === "admin"` branch, added alongside TASK-3204 for exactly this future read) — so an `admin` session gets every lesson `locked: false` regardless of enrollment/subscription/status, with zero new service code. The new page, `admin/courses/[courseId]/page.tsx`, renders through the same shared `CourseDetailView` (TASK-3104) a third time (student page, teacher preview, now this) — no edit controls, since editing stays on the teacher-facing course editor. A "View" row action was added to `CourseOverview`'s table (`components/admin/course-overview.tsx`, TASK-2401) linking to the new page. New translations under `adminDashboard.courseOverview.detail` plus a `view`/`columns.actions` addition to the existing `courseOverview` block, in both `messages/en.json`/`messages/ar.json` (parity checked by hand, 1014/1014 keys match). Documentation: `docs/features/courses.md` gets a new "Admin course view" section, including an explicit scope note — per-lesson video/file playback and the linked-exam view are deferred, this page shows the lesson list the same way the student/preview pages do, not an embedded player (the task's "(lessons, videos, files, linked exam)" phrase reads as *what a course contains*, not a requirement to embed a full player here; a future task can add per-lesson content viewing on top of this same page if wanted). Testing: `courseService.test.ts` gets an admin-session case for `getCourseForStudent`; `lessonService.test.ts` gets an admin-session case for `listLessonsForCourseDetail` (unlocked regardless of enrollment/subscription) — both alongside the existing TASK-3204 describe blocks rather than new ones, since no new service surface exists to test. Verification could not run for real this session (no network in this sandbox — `npm install` 403s, `node_modules` was never installed) — reviewed by hand instead, same constraint recent sessions in this phase file hit. Phase 33 stays `Not Started` at the phase level (TASK-3301/3302/3303/3304/3305/3307 remain `Not Started`), but this is the first task in it to land; TASK-3307 (Admin can open a teacher's/student's profile page) has no unmet dependency and is next.

## TASK-3307: Admin can open a teacher's or student's account/profile page
- Description: From the Admin teachers list and students list, clicking a row opens that user's account page: for a teacher, the TASK-3101/3102 profile plus their courses/offerings/subscriptions; for a student, the TASK-3201 profile plus their enrollments/subscriptions/payment history — same information the user sees about themselves, in an Admin-facing read view.
- Dependencies: TASK-3101, TASK-3201, Phase 24 (existing admin oversight patterns)
- Affected modules: `app/[locale]/(protected)/admin/teachers/[teacherId]/page.tsx`, `app/[locale]/(protected)/admin/students/[studentId]/page.tsx`, `components/admin/*`
- Acceptance criteria: Admin can view full profile + activity for any teacher or student from the respective list.
- Testing requirements: authorization test (Admin-only); data-completeness test (all expected sections render for a seeded account).
- Documentation requirements: Phase 24's oversight doc, extended.
- Status: Done — two new pages, `admin/teachers/[teacherId]/page.tsx` and
  `admin/students/[studentId]/page.tsx`, each rendering a new read-only
  view component (`TeacherAccountView`/`StudentAccountView`) built almost
  entirely from *already-admin-allowed* reads: `teacherManagementService
  .getTeacherDetail`, `teacherOfferingService.listForTeacher`, and
  `adminCourseOverviewService.listCourses` (filtered to this teacher) for
  the teacher page; `studentManagementService.getStudentDetail`,
  `studentService.getStudentDetail` (called *without* a `teacherId`, so
  it returns enrollments across every teacher instead of the TASK-2403
  per-teacher-scoped slice), and `subscriptionService.listForStudent` for
  the student page. Two small additions were genuinely new: `teacherProfileService
  .getProfileForAdmin(session, teacherId)` (mirrors `getMyProfile` but
  keyed by an explicit `teacherId` instead of `session.uid`, and returns
  `null` instead of throwing when no `teacherProfiles` doc exists yet, so
  the rest of the page still renders) and `paymentService
  .listForStudentAdmin(session, studentId)` (mirrors `subscriptionService
  .listForStudent`'s existing admin-only, studentId-keyed shape — no
  such read existed for payments before this task). A "View profile" row
  action was added to both `TeacherManager` and `StudentManager`'s
  tables, linking to the new pages. One deliberate edge case:
  `studentService.getStudentDetail` throws `NotFoundError` for a student
  with zero enrollments (by design, per its own doc comment) — the page
  catches that specific case and renders an empty enrollments section
  rather than 404ing the whole account page, since a newly created
  student with no enrollments yet is a valid state, not a missing
  account. New translations under `adminDashboard.teachers.profile` and
  `adminDashboard.students.profile`, plus a `viewProfile` key on each of
  `adminDashboard.teachers`/`adminDashboard.students`, in both
  `messages/en.json`/`messages/ar.json` (parity checked by hand,
  1068/1068 keys match). Testing: added unit tests for both new service
  methods (`teacherProfileService.test.ts`'s `getProfileForAdmin`
  describe block, `paymentService.test.ts`'s `listForStudentAdmin`
  describe block) — role-gating and the happy path for each; no new
  authorization surface beyond `assertRole(session, "admin")` on both,
  same pattern every other Admin-only service method in this file uses.
  Verification could not run for real this session (no network in this
  sandbox — `npm install` 403s, `node_modules` was never installed) —
  reviewed by hand instead, same constraint TASK-3306 and other recent
  sessions in this phase file hit. Documentation: this file's own status
  line, `docs/tasks/README.md`'s status table/log. Phase 33 moves to
  `In Progress` at the phase level (TASK-3306/3307 both `Done` now);
  TASK-3301–3305 remain `Not Started` and form a separate chain
  (3304/3305 depend on 3302/3303) — pick whichever unblocks what you
  want to ship next.
