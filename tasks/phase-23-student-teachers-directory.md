# Phase 23 — "My Teachers" (Student-Facing)

> A student currently has no in-dashboard way to see who they're
> enrolled with — the public `/teachers/[slug]` page (`features/
> public-pages.md`) exists, but nothing links a student to *their own*
> teachers from inside the student dashboard. This phase adds that list,
> derived the same way `features/students.md` already derives a
> teacher's "my students" — from `enrollments`, not a new relationship
> collection.

## TASK-2301: "My teachers" derived list service
- Description: New read: for the signed-in student, the distinct set of teachers they have an *active* (or any non-cancelled — decide against `features/enrollment.md`'s existing status semantics) enrollment with, each with a course count and a link. Mirrors `studentService.listStudents`' derive-from-enrollments shape (TASK-1001), just from the student's side instead of the teacher's.
- Dependencies: TASK-1101 (enrollment repository)
- Affected modules: `lib/server/services/teacherDirectoryService.ts` (new, or extend `studentService`), `app/api/student/teachers/route.ts`
- Status: Done

> New `teacherDirectoryService.ts` (not merged into `studentService`, since
> that service is teacher/admin-scoped via `assertRole` and this one is
> student-scoped — keeping them separate avoids one file mixing two
> opposite-direction owner checks). Mirrors `studentService.listStudents`'
> shape exactly: `enrollmentRepository.listByStudent(session.uid)` (TASK-
> 1101, already exists) grouped by `teacherId` instead of `studentId`, then
> joined to `teacherProfileRepository` (name/avatar/slug/subjectId) and
> `subjectRepository.list()` (small, center-wide, so a full list + local
> map beats N `findById` calls) for the subject display name.
> Decided the "active (or any non-cancelled)" question in the task
> description: excludes only `cancelled` enrollments, keeping `completed`
> — a student who finished a course still has a relationship with that
> teacher worth showing, same reasoning `enrollment.schema.ts`'s three-
> state status implies.
> `teacherProfileRepository` gained a bulk `findByIds` (chunked `__name__
> in`, missing ids simply absent) — same pattern as `userRepository.
> findByIds`, which didn't exist on this repository yet since every prior
> caller only ever needed one teacher's profile at a time.
> `GET /api/student/teachers` follows the existing student-route shape
> (`app/api/student/notifications/route.ts`): `requireSession` +
> `handleApiError`, no extra params.
> Unit tests in `teacherDirectoryService.test.ts` (grouping/join, cancelled-
> exclusion, missing-profile fallback, non-student rejection) follow
> `studentService.test.ts`'s mock-the-repositories pattern. Could not run
> the suite — no `node_modules`/network in this sandbox (same limitation
> noted on every task in this project); did a bracket-balance pass instead.
> No i18n/RTL/theme surface — this task is service + API route only, no
> UI (that's TASK-2302).

## TASK-2302: "My teachers" page UI
- Description: New student nav item + page listing each teacher (avatar, name, subject) with a link into that teacher's courses. Add the nav entry to `components/layout/student-sidebar.tsx` (currently just "My Courses" + "Settings").
- Dependencies: TASK-2301, TASK-204
- Affected modules: `app/[locale]/(protected)/student/teachers/page.tsx` (new), `components/layout/student-sidebar.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Done

> Server component reading straight from `teacherDirectoryService.
> listMyTeachers` (TASK-2301) — same shape as `student/exams/page.tsx`
> (`requireSession` + `assertRole` + render, no client fetch). Card grid
> mirrors `student/exams`' empty-state/card-grid layout; avatar fallback
> (initial-letter circle when `avatarUrl` is absent) copies the public
> teacher-profile page's exact pattern (`(public)/teachers/[slug]/page.
> tsx`) for visual consistency between the two teacher-avatar surfaces.
> Added a "My teachers" nav item to `student-sidebar.tsx` (after
> "Exams") using the same `DashboardNavItem`/`Icon` pattern as the
> existing three items — no new nav component needed (TASK-204's
> dependency was already satisfied by the existing sidebar shape).
> New `studentTeachers` message namespace (`en.json`/`ar.json`) plus one
> added `studentDashboard.nav.myTeachers` key; `coursesCount` uses the
> project's existing ICU `plural` convention (`unreadNotifications`,
> `questionCount`) rather than inventing a non-plural label pair. Checked
> key parity between `en.json`/`ar.json` by hand (`scripts/check-
> translations.ts`'s own check, no `node_modules` in this sandbox) — 0
> keys missing either direction.
> `subjectName` is passed through the service as the raw `LocalizedText`
> (not pre-localized), same as `courseService`'s `title`/`description` —
> this page picks `en`/`ar` itself via a local `localizedText` helper,
> copied from the same helper already duplicated in `(public)/courses/
> [slug]/page.tsx` and `(public)/teachers/[slug]/page.tsx` rather than
> extracted to a shared util, to stay consistent with the existing
> per-page duplication in this codebase.
> No new RTL-specific markup: only logical utilities already used
> elsewhere in this component tree (`ps-4`, `border-s-4`) — checked by
> hand against `internationalization/rtl-ltr.md` (no `node_modules` to
> run `scripts/check-rtl-ltr.ts`). No light/dark-specific styling either
> — same semantic color tokens (`bg-primary/10`, `text-foreground/60`,
> `border-border`) the rest of the student dashboard already uses.

## TASK-2303: Teacher courses view, scoped to enrollment
- Description: Clicking a teacher from TASK-2302 should show that teacher's courses — reuse the public `publicRepository` course list (`features/public-pages.md`) for published courses, but additionally flag which ones this student is already enrolled in vs. which are available to enroll/purchase. Not a full "browse & buy" storefront redesign — just enough to answer "what else does this teacher offer."
- Dependencies: TASK-2301, TASK-1401 (public pages)
- Affected modules: `app/[locale]/(protected)/student/teachers/[teacherId]/page.tsx` (new)
- Status: Done

> Extended `teacherDirectoryService` (TASK-2301) rather than adding a
> separate service, with `getTeacherCoursesForStudent`: reuses
> `publicRepository.listPublishedCoursesByTeacher` (the exact same
> published-courses source `/teachers/[slug]` already reads, per this
> task's "reuse the public repository" instruction) and layers an
> `enrolled` flag from the student's own enrollments for that teacher.
> Scoped like `studentService.getStudentDetail`: a student with no
> non-cancelled enrollment for the given `teacherId` gets `NotFoundError`
> (never leaks whether the teacherId exists) — same "owner-scoped lookup"
> shape used throughout Phase 10/11, adapted to the student's own
> ownership of the *relationship* rather than a teacher's ownership of a
> resource.
> Page mirrors `student/exams/[quizId]/page.tsx`'s shape (`notFound()` on
> `NotFoundError`, `Breadcrumb` back to the list, `PageProps` typed
> route). Course cards reuse `EmptyState`/`Card`/`Badge` (no new
> component) — `Badge` flags `enrolled` vs `availableBadge` rather than
> a full storefront/checkout UI, per the task's explicit "not a full
> browse & buy redesign" scope.
> Same avatar-fallback pattern as TASK-2302 and the public teacher page.
> `subjectName`/course `title`/`description` are all raw `LocalizedText`,
> localized in the page via the same local `localizedText` helper as
> TASK-2302 (now duplicated a third time in this codebase, consistent
> with the existing per-page convention rather than a new shared util).
> Extended `teacherDirectoryService.test.ts` with three cases (enrolled-
> flag correctness, not-found-when-no-live-enrollment, non-student
> rejection) in the same mock-repositories style; still couldn't run the
> suite (no `node_modules`/network in this sandbox), bracket-balance pass
> done instead.
> No new API route — this page reads the service directly server-side,
> same as TASK-2302 and `student/exams/[quizId]`, so nothing here is
> reachable client-side that isn't already gated by `requireSession`/
> `assertRole` in the page itself.
> i18n: added `emptyCoursesTitle`/`enrolledBadge`/`availableBadge` to the
> `studentTeachers` namespace in both `en.json`/`ar.json`; key parity
> checked by hand. RTL/theme: same logical utilities and semantic color
> tokens as TASK-2302, no new patterns introduced.
