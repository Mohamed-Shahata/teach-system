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
- Status: Not Started

## TASK-3302: Analytics — monthly revenue breakdown
- Description: A revenue chart combining confirmed `payments` and confirmed `subscriptionInvoices`, grouped by month, with the filter from TASK-3304 applied.
- Dependencies: Phase 19 (`analyticsRepository`), Phase 29 (`subscriptionInvoices`)
- Affected modules: `lib/server/repositories/analyticsRepository.ts`, admin analytics page/components
- Acceptance criteria: chart reflects real confirmed revenue across both payment models for the selected range.
- Testing requirements: repository unit test for the aggregation query.
- Documentation requirements: analytics doc (TASK-3304 covers the shared doc update).
- Status: Not Started

## TASK-3303: Analytics — teacher/subject/stage breakdowns
- Description: Three new analytics views: (a) teachers ranked by total active students, (b) subjects ranked by total active students, (c) student count per education stage. All reuse existing `enrollments`/`subscriptions` data, aggregated server-side.
- Dependencies: Phase 19, Phase 29
- Affected modules: `lib/server/repositories/analyticsRepository.ts`, admin analytics UI
- Acceptance criteria: three new chart/table sections, each correctly ranked/grouped and matching a manual count against seed data.
- Testing requirements: repository unit tests for each of the three aggregations.
- Documentation requirements: analytics doc.
- Status: Not Started

## TASK-3304: Analytics — universal date-range filter (month / year / 5-year)
- Description: A single filter control (month, year, or 5-year window) that applies to every chart on the analytics page — TASK-3302, TASK-3303, and the existing Phase 19 charts (revenue growth, subscription growth, etc.) all read from the same selected range instead of each having independent filters.
- Dependencies: TASK-3302, TASK-3303, Phase 19's existing charts
- Affected modules: shared analytics filter state/component, `lib/server/repositories/analyticsRepository.ts` (range parameter threaded through every query)
- Acceptance criteria: changing the filter re-renders every chart on the page consistently; the three preset granularities (month/year/5-year) all produce correct bucket boundaries.
- Testing requirements: repository tests per granularity; a UI test confirming the filter drives every chart, not just one.
- Documentation requirements: analytics doc gets a "filtering" section.
- Status: Not Started

## TASK-3305: Excel export of analytics/reports
- Description: An "Export to Excel" action on the analytics page producing a `.xlsx` (the project already depends on `exceljs` per `package.json`) covering the currently-filtered (TASK-3304) data: revenue, enrollments, teacher/subject/stage breakdowns.
- Dependencies: TASK-3302, TASK-3303, TASK-3304
- Affected modules: `app/api/admin/analytics/export/route.ts` (new), reuses `exceljs` the way Phase 28's exam-results export does (`docs/features/exam-results-export.md` as a pattern reference)
- Acceptance criteria: exported workbook's numbers match what's on-screen for the same filter selection; each breakdown gets its own sheet.
- Testing requirements: route test asserting workbook structure/sheet names and a spot-check of computed values.
- Documentation requirements: `docs/features/exam-results-export.md`-style new doc, or extend it to cover both exports.
- Status: Not Started

## TASK-3306: Admin can open a course and view its content
- Description: From the Admin courses list, clicking a course opens a read-only view of its full content (lessons, videos, files, linked exam) — reusing the same course-detail rendering built for TASK-3104's teacher preview, in a read-only Admin context.
- Dependencies: TASK-3104 (shared rendering component)
- Affected modules: `app/[locale]/(protected)/admin/courses/[courseId]/page.tsx` (new), `components/admin/*`
- Acceptance criteria: Admin can view any course's full lesson/content structure regardless of enrollment; no edit controls are exposed in this view (editing stays on the existing teacher-facing editor, opened separately if the Admin needs to edit).
- Testing requirements: authorization test (Admin-only route); rendering test reusing TASK-3104's component.
- Documentation requirements: `docs/features/courses.md`.
- Status: Not Started

## TASK-3307: Admin can open a teacher's or student's account/profile page
- Description: From the Admin teachers list and students list, clicking a row opens that user's account page: for a teacher, the TASK-3101/3102 profile plus their courses/offerings/subscriptions; for a student, the TASK-3201 profile plus their enrollments/subscriptions/payment history — same information the user sees about themselves, in an Admin-facing read view.
- Dependencies: TASK-3101, TASK-3201, Phase 24 (existing admin oversight patterns)
- Affected modules: `app/[locale]/(protected)/admin/teachers/[teacherId]/page.tsx`, `app/[locale]/(protected)/admin/students/[studentId]/page.tsx`, `components/admin/*`
- Acceptance criteria: Admin can view full profile + activity for any teacher or student from the respective list.
- Testing requirements: authorization test (Admin-only); data-completeness test (all expected sections render for a seeded account).
- Documentation requirements: Phase 24's oversight doc, extended.
- Status: Not Started
