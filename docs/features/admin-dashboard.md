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
