# Phase 10 — Student Management

## TASK-1000: Teacher creates student account
- Description: UI + `POST /api/teacher/students` (see TASK-604) form for a teacher to create a student account, set their `stageId`, and optionally enroll them directly in one of the teacher's own courses.
- Dependencies: TASK-604
- Affected modules: `components/teacher/student-manager.tsx`, `app/[locale]/(protected)/teacher/students/page.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Done

> The API side (`POST /api/teacher/students`) already existed from
> TASK-604; this task was the UI. `StudentManager` is a standalone
> create form, not a list+dialog like `CourseManager` — there's no
> teacher-scoped student list to show yet (TASK-1001, Not Started), so
> after a successful create it just surfaces the returned one-time
> password-reset link (`CreatedAccount.resetLink`, per
> `decisions/0005-account-creation-credential-delivery.md`) for the
> teacher to relay to the student. The optional "enroll directly in one
> of the teacher's own courses at creation time" part of the
> description is **not** implemented, for the same reason it isn't in
> the API (see the note on TASK-604 in
> `phase-06-ownership-access.md`): enrollment only ever happens as a
> side effect of the payments flow (Phase 11, Not Started). Revisit
> once TASK-1104 lands. No component tests added — none exist yet for
> any teacher-dashboard component in this codebase (testing is Phase
> 16, Not Started); the existing route/service tests from TASK-604
> already cover the API this form calls.

## TASK-1001: Teacher-scoped student query
- Description: Service deriving a teacher's student list from `enrollments` filtered by `teacherId`.
- Dependencies: TASK-602
- Status: Done

> Unblocked by TASK-1101 landing (this task's own note above is now
> stale — see history). `enrollmentService.listForTeacher` *is* this
> query — TASK-602 scoping, filtered by `teacherId`, exactly as
> described — so no new module was needed; this task is satisfied by
> that method. Deriving actual per-student rows (grouping enrollments by
> `studentId`, joining `users` for name/email) is left to TASK-1002,
> which is the first task that actually needs that shape.

## TASK-1002: Student list & detail UI
- Description: List + detail view (enrolled courses, progress, quiz results) for a teacher's students.
- Dependencies: TASK-1001, TASK-204
- Status: Not Started

> Unblocked by TASK-1101/TASK-1001. Not started this session — quiz
> results (part of the "detail view" scope) depend on TASK-1201/1202
> (Phase 12, Not Started), so a first pass would need to either stub
> that section or scope it down to enrolled courses + progress only.
> Left for the next turn rather than half-implementing the detail view.
