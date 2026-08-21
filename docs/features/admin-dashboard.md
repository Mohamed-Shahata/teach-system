# Feature: Admin Dashboard

## Purpose
The Admin's control center for the whole system: system-wide stats,
teacher/student account management, center configuration (education
stages, subjects), and cross-teacher payments oversight. See
`docs/tasks/phase-19-admin-dashboard.md`.

## Data
System-wide stats are read from a denormalized `systemStats` doc
(same pattern as `teacherProfiles.stats`, see `features/teacher-dashboard.md`),
not live aggregation queries, for the same cost/latency reasons.

## Account management
Teacher/student lists reuse `users` (filtered by `role`) rather than a
separate collection. "Deactivate" disables the Firebase Auth account
(`adminAuth.updateUser(uid, { disabled: true })`) so the person can no
longer log in; it does not delete their data.

## Scope discipline
Per project rules, this stays admin-operations-focused — no general
analytics/BI tooling in the MVP (e.g. no custom date-range reports,
no export). See `docs/tasks/phase-19-admin-dashboard.md` for the
task-by-task breakdown.

## Extensions (Phase 24)
Center-wide course visibility, multi-subject teachers, and a per-teacher
student drill-down were added per `docs/tasks/phase-24-admin-
oversight.md` (all three tasks now `Done`): a read-only Admin course
overview (`admin/courses`), `teacherProfiles.subjectIds` (a teacher may
now be assigned more than one subject), and a "View students" action on
each teacher row opening a read-only per-teacher student list + detail
view (reusing the teacher-facing `StudentList`/`StudentDetailView`).

## Analytics (Phase 33)
`admin/analytics` (`analyticsRepository`/`analyticsService`) adds a
live-queried revenue/growth/breakdown view on top of this dashboard —
see that phase's own tasks (`docs/tasks/phase-33-admin-insights.md`)
for the "Scope discipline" note above being about the *original* MVP
dashboard, not this later addition. Two headline figures
(`totalRevenue`, `activeSubscriptions`) stay all-time/current-snapshot
regardless of the filter below; everything else — the two time-series
charts and the three TASK-3303 breakdowns (teacher/subject/stage) — is
range-scoped.

### Filtering (TASK-3304)
A single control (`month` / `year` / `5year`) drives every ranged chart
and breakdown on the page from the same window — no per-chart filters.
`analyticsRepository.buildRange(granularity)` resolves one
`AnalyticsRange` (`{ since, until, bucketKeys }`) per request:
- `month` — one bucket per day of the current calendar month.
- `year` — 12 monthly buckets across the current calendar year.
- `5year` — 5 yearly buckets, the current year and the 4 before it.

`GET /api/admin/analytics?granularity=month|year|5year` (default
`year`) threads that one range through `monthlyRevenue`,
`monthlySubscriptionGrowth`, and all three TASK-3303 breakdown queries,
so changing the filter re-renders every chart consistently. Revenue
still combines both payment models (TASK-3302's invoice `period` +
one-off `payments.createdAt`); an invoice only carries a `YYYY-MM`
period, so under `month` granularity its whole amount lands on that
month's first day rather than a specific day (no finer-grained billing
date exists to bucket it by).

### Excel export (TASK-3305)
`GET /api/admin/analytics/export?granularity=month|year|5year` streams
back a `.xlsx` workbook for the current filter selection — same
file-download shape as `docs/features/exam-results-export.md`'s exam
report export (`Content-Disposition: attachment`, no JSON envelope).
`analyticsExportService.getOverview` calls the exact same
`analyticsService.getOverview` the on-screen page's
`GET /api/admin/analytics` route calls, so the exported numbers can
never drift from what's on-screen for that filter — there's no second
query path to keep in sync. `renderXlsx` writes one sheet per section:
`Summary` (the four headline cards + pending-invoice count), `Revenue`
and `Subscription Growth` (the two time series, one row per bucket),
and `Teachers` / `Subjects` / `Stages` (the three TASK-3303 breakdowns,
one row per ranked entry). An "Export to Excel" link next to the
existing Refresh button on `AdminAnalyticsOverview` points at this
route with the page's current `granularity`, so the download always
matches whatever range the Admin is looking at.
