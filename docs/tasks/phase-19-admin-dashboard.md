# Phase 19 — Admin Dashboard & System Analytics

> Added after the initial 18-phase roadmap was drafted. The MVP so far
> only gives the Admin two API endpoints (`TASK-604`, account creation) —
> no dedicated UI. This phase gives the Admin a real dashboard: system-wide
> stats, account management, and center-level configuration. It has no
> hard dependency on Phase 7 (Teacher Dashboard), but ships after it —
> the teacher-facing product is the core loop and lands first; see
> `docs/tasks/phase-07-teacher-dashboard.md`.

## TASK-1901: Admin dashboard layout & nav
- Description: Sidebar/nav for Overview, Teachers, Students, Education Stages/Subjects, Payments, Settings, per `features/admin-dashboard.md` and `architecture/folder-structure.md`. Route-guarded to `role: "admin"` only (`app/[locale]/(protected)/admin/*`).
- Dependencies: TASK-406, TASK-204
- Status: Not Started

## TASK-1902: System-wide stats overview
- Description: Aggregate cards/charts across the whole center — total teachers, total students, total courses (by status), total enrollments, total published lessons. Backed by denormalized counters (new `systemStats` doc, updated the same way `teacherProfiles.stats` is) rather than live collection scans, per `database/collections.md` conventions.
- Dependencies: TASK-1901
- Affected modules: `lib/server/repositories/systemStatsRepository.ts`, `app/api/admin/stats/route.ts`
- Status: Not Started

## TASK-1903: Teacher management (list, view, deactivate)
- Description: Admin-facing list of all teachers with search/filter, a detail view (their courses/students/enrollment counts), and an activate/deactivate action (disables Firebase Auth account + blocks login) — per `features/admin-dashboard.md`.
- Dependencies: TASK-602, TASK-1901
- Affected modules: `app/api/admin/teachers/route.ts`, `app/api/admin/teachers/[teacherId]/route.ts`
- Status: Not Started

## TASK-1904: Student management (list, view, deactivate)
- Description: Admin-facing list of all students across all teachers (unlike a teacher's own student list, this is center-wide), with the same deactivate action as TASK-1903.
- Dependencies: TASK-602, TASK-1901
- Affected modules: `app/api/admin/students/route.ts`, `app/api/admin/students/[studentId]/route.ts`
- Status: Not Started

## TASK-1905: Education stages & subjects management UI
- Description: CRUD UI over the `educationStages` and `subjects` collections (currently seed-script-only per `database/collections.md`), so the Admin can manage the center's grade levels and subjects without a script.
- Dependencies: TASK-1901
- Affected modules: `app/api/admin/education-stages/route.ts`, `app/api/admin/subjects/route.ts`
- Status: Not Started

## TASK-1906: Center-wide payments oversight
- Description: Read-only view (for the Admin) across every teacher's payments — not just confirm/reject like the teacher queue (`TASK-704`), but full visibility for support/dispute handling.
- Dependencies: TASK-1901, TASK-1104 (payments service)
- Status: Not Started

## TASK-1907: Admin account settings
- Description: Admin's own profile settings (display name, password change) — the Admin equivalent of the teacher `settings/page.tsx` from Phase 7.
- Dependencies: TASK-1901
- Status: Not Started
