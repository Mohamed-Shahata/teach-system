# Phase 7 — Teacher Dashboard

## TASK-701: Teacher dashboard layout & nav
- Description: Sidebar/nav for Overview, Courses, Lessons, Students, Exams, Files, Settings, per `features/teacher-dashboard.md` and `architecture/folder-structure.md`.
- Dependencies: TASK-406, TASK-204
- Status: Done

> Note: no standalone "Lessons" nav item — lessons are always managed
> inside a course (`teacher/courses/[courseId]/lessons/...`, per
> `features/lessons.md`), and `architecture/folder-structure.md` has no
> top-level `teacher/lessons` route, so a nav link for it would have
> nowhere real to point yet. Reached via Courses instead.
> Shell components added under `components/layout/` (`dashboard-shell.tsx`,
> `dashboard-topbar.tsx`, `dashboard-nav-item.tsx`) are generic over the
> sidebar content, not teacher-specific — `teacher-sidebar.tsx` is the
> only teacher-specific piece — so Phase 19's `TASK-1901` (Admin dashboard
> layout) can reuse the shell with an `AdminSidebar` instead of
> duplicating it.
> Courses/Students/Exams/Files/Settings pages are placeholder
> ("coming soon") content only — this task is the nav/shell, not those
> features; each gets real content in its own phase (8, 10, 12, 13, and
> TBD respectively).
> Found and fixed two pre-existing dangling redirects while wiring this
> up, both from before the multi-role re-scope: (1) `login-form.tsx`
> redirected to a hardcoded `/dashboard`, which was never a real route
> under the current folder structure — `/api/auth/session` now returns
> the caller's `role` and the client redirects to `/{locale}/{role}`
> instead. (2) `proxy.ts`'s own role-mismatch redirect
> (`/{locale}/{session.role}`) pointed at `/{locale}/teacher`, which had
> no `page.tsx` — added `app/[locale]/(protected)/teacher/page.tsx` as a
> redirect-only index into `teacher/dashboard` so that target resolves.
> Both fixes are teacher-side only; the same gap will exist for
> `student`/`admin` until their own dashboard-layout tasks land.

## TASK-702: Dashboard stats
- Description: Read denormalized `teacherProfiles.stats` and render overview cards (students, courses, published courses, lessons, enrollments).
- Dependencies: TASK-701
- Status: Done

> Note: `app/[locale]/(protected)/teacher/dashboard/page.tsx` now renders
> the five MVP overview cards from `teacherProfiles/{uid}.stats`, using
> the verified teacher session as the only source of the teacher id.
> `teacherProfileRepository.findStatsByTeacherId` normalizes missing or
> legacy partial stats to zeroes so older dev-seeded teacher profiles do
> not break the dashboard. New teacher profiles from `accountService` and
> `scripts/seed-dev-accounts.ts` are created with the full zeroed stats
> shape. Translation keys added for en/ar, and
> `docs/database/collections.md` now documents all five stats counters.
> Unit coverage added for stats normalization; full test suite passes.

## TASK-703: Weekly schedule management
- Description: `schedule` repository/service/API (`GET/POST/PATCH/DELETE /api/teacher/schedule`) + UI for a teacher to add/edit/delete their own recurring weekly class slots, per `features/schedule.md`.
- Dependencies: TASK-602, TASK-701
- Status: Done

> Note: added `scheduleRepository`, `scheduleService`, Zod request schemas,
> and `/api/teacher/schedule` handlers for listing, creating, updating,
> and deleting a teacher's own recurring weekly slots. The service derives
> `teacherId` only from the verified session and repository updates/deletes
> re-check ownership with TASK-602 helpers. The teacher dashboard now
> includes a weekly schedule manager under the overview stats. Because
> subject/stage admin UIs and course management are later phases, the MVP
> form accepts reference IDs directly for now; those inputs can become
> dropdowns once Phase 8/19 reference-data screens exist. Firestore rules,
> API docs, Firebase index docs, translations, and unit/API tests were
> updated with this schedule surface.

## TASK-704: Pending manual payments queue
- Description: List of `pending` manual (`vodafone_cash`/`bank_transfer`) payments for the teacher's own courses, with confirm/reject actions, per `features/payments.md`.
- Dependencies: TASK-602, TASK-701, TASK-1104 (payments service)
- Status: Blocked

> Note: reached after TASK-703, but this queue cannot be implemented
> honestly yet because its backing payments repository/service/state
> machine is TASK-1104 and remains Not Started. Revisit immediately after
> TASK-1104 lands; the teacher dashboard shell is ready to host it.
