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
- Status: Done

> Scoped down to enrolled courses + progress, per the note left on this
> task last session — quiz results still depend on TASK-1201/1202 (Phase
> 12, Not Started) and are not included; the detail view can grow a quiz
> results section once those land, without changing today's shape.
>
> New `lib/server/services/studentService.ts` (`listStudents` /
> `getStudentDetail`) derives the list by grouping
> `enrollmentRepository.listByTeacher` (TASK-1001) by `studentId`, joining
> `users` for name/email — there's still no `students` collection, per
> `features/students.md`. Added `userRepository.findByIds` and
> `courseRepository.findByIds` (chunked `in` queries) for the joins.
> `getStudentDetail` scopes to the requesting teacher's own enrollments
> and throws `NotFoundError` for a student with none, so a teacher can't
> probe another teacher's students by uid.
>
> API: `GET /api/teacher/students` (list, added alongside the existing
> `POST` from TASK-604/1000) and `GET /api/teacher/students/[studentId]`
> (detail). UI: `components/teacher/student-list.tsx` (table on the
> existing students page, above `StudentManager`) and
> `components/teacher/student-detail-view.tsx` + a new
> `teacher/students/[studentId]/page.tsx`, mirroring the course detail
> page's `notFound()`-on-`NotFoundError` pattern (TASK-903). Both list and
> detail are read-only server components — no interactive actions in this
> task's scope.
>
> Tests: `studentService.test.ts` (grouping, joins, uid fallback,
> teacher-scoping, role gates) and route tests for both new endpoints —
> full suite green (186/186), `next build` succeeds, `check-translations`
> / `check-rtl-ltr` / `check-contrast` all pass. i18n added under
> `teacherDashboard.students.list` and `.detail` in both locales. No
> component-level UI tests, same as every other teacher-dashboard
> component in this codebase (Phase 16, Not Started).

## TASK-1005: Student account settings + shared avatar upload

- Description: The center had no self-service Student settings page at
  all (unlike the Admin/Teacher, which at least had a placeholder or a
  real page). Adds one, and — since every role gets a profile picture —
  introduces a shared `target: "avatar"` upload path other settings
  pages (TASK-705, TASK-1907) also use.
- Dependencies: TASK-1000 (student accounts), TASK-604 (upload
  signing/`uploadService`)
- Affected modules: `lib/validation/upload.schema.ts` (new `"avatar"`
  target), `lib/validation/account.schema.ts` (`updateAvatarSchema`),
  `lib/server/repositories/userRepository.ts` (`avatarUrl`/
  `avatarPublicId` fields + `updateAvatar`), `lib/server/services/
  uploadService.ts` (avatar target open to every role, not just
  teacher), `lib/server/services/studentSettingsService.ts`,
  `app/api/student/settings/route.ts`,
  `app/api/student/settings/password-reset-link/route.ts`,
  `app/api/student/settings/avatar/route.ts`,
  `components/student/student-settings-form.tsx`,
  `app/[locale]/(protected)/student/settings/page.tsx`,
  `components/layout/student-sidebar.tsx` (new "Settings" nav item).
- Status: Done — `studentSettingsService` mirrors `adminSettingsService`
  (TASK-1907): display name (dual write), password (one-time reset link,
  ADR 0005), and avatar (persists a client-completed Cloudinary upload,
  destroys the previous asset best-effort). The avatar upload itself
  reuses the existing signed-upload flow end to end
  (`lib/client/upload.ts`'s `uploadImage`, `POST /api/uploads/sign`) —
  `uploadService.signUpload` now only requires `role === "teacher"` for
  the course/lesson targets, not for `avatar`, and folders it into
  `{role}s/{uid}/avatar` so cleanup mirrors the existing
  `docs/cloudinary/README.md` folder layout. No Firestore rules change
  needed — `users/{uid}` self-update was already permitted for any field
  except `role`/`createdBy`.
