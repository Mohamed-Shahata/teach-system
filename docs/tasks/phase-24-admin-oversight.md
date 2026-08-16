# Phase 24 — Admin Oversight Enhancements

> Three additions to the Phase 19 Admin Dashboard (`features/
> admin-dashboard.md`): visibility into every teacher's courses, letting
> a teacher be assigned more than one subject, and drilling into a
> single teacher's students from the Admin side.

## TASK-2401: Center-wide courses list (read-only)
- Description: New Admin screen listing every course across every teacher (title, teacher, subject, stage, status, enrollment count) with search/filter by teacher/subject/stage/status — same shape as `TeacherManager`/`StudentManager` (TASK-1903/1904): a service that joins `courses` with `teacherProfiles`/`users` for display names, read-only (no edit/delete from here — that stays teacher-owned, per the existing ownership model in `architecture/ownership-model.md`).
- Dependencies: TASK-1901, TASK-801 (course repository/service)
- Affected modules: `lib/server/services/adminCourseOverviewService.ts` (new), `app/api/admin/courses/route.ts`, `components/admin/course-overview.tsx` (new), `app/[locale]/(protected)/admin/courses/page.tsx` (new)
- Status: Done

> `adminCourseOverviewService.listCourses` needed no new repository
> query: `courseRepository.list(session)` and `enrollmentRepository.
> listByTeacher(session)` already return every teacher's rows unscoped
> for an Admin session (`scopeToTeacher`'s existing admin bypass, `lib/
> server/repositories/base.ts`) — this service is purely the join
> (teacher name via `teacherProfileRepository.findByIds`, subject/stage
> names via the small center-wide `subjectRepository.list`/
> `educationStageRepository.list`) plus a client-derived enrollment
> count per course (`Map<courseId, count>` from the unscoped enrollment
> list, rather than a new aggregation query).
> `CourseOverview` (`components/admin/course-overview.tsx`) is read-only
> by design, per the task's "no edit/delete from here" instruction — no
> dialogs, no mutating actions, unlike `TeacherManager`/`StudentManager`.
> Search + teacher/subject/stage/status filters are all client-side over
> the single `GET /api/admin/courses` payload (small dataset, same as
> every other admin list before its own search box triggers a server
> round trip) — the API route exists per the task's affected-modules
> list and for parity with every other admin resource having one, even
> though this page's initial load reads the service directly server-side
> and never calls the route itself.
> Added a "Courses" item to `admin-sidebar.tsx` (after "Teachers") — not
> one of the original six Phase 19 sections, so called out separately in
> that file's own doc comment.
> New `adminDashboard.courseOverview` message namespace (`en.json`/
> `ar.json`) plus one added `adminDashboard.nav.courses` key; key parity
> checked by hand (no `node_modules` for `scripts/check-translations.
> ts`). No RTL-specific markup beyond the logical utilities already used
> elsewhere in this admin section (checked by hand against
> `internationalization/rtl-ltr.md`). No light/dark-specific styling —
> same semantic tokens (`bg-surface-muted`, `border-border`, badge
> variants) `Table`/`Badge` already carry.
> `adminCourseOverviewService.test.ts` covers the join/count logic,
> missing-profile fallback, and the admin-only guard, following
> `teacherManagementService.test.ts`'s mock-repositories pattern. Could
> not run the suite — no `node_modules`/network in this sandbox (same
> limitation noted on every task in this project); did a bracket-balance
> pass instead.

## TASK-2402: Multiple subjects per teacher
- Description: Today `teacherProfiles.subjectId`/`users.subjectId` is a single ref (per `teacherProfileRepository`'s doc comment: "one specialization per teacher"), while `database/collections.md` already documents the target shape as `subjectIds: string[]`. This task closes that gap: migrate the field to an array, update `accountService.createAccountByAdmin`/`updateTeacherProfileSchema` to accept multiple subject ids, update the Admin's Teacher edit dialog to a multi-select, and update `teacher/courses/page.tsx`'s "narrow to the teacher's own assigned subject(s)" filter (currently `allSubjects.filter(s => s.id === teacherProfile.subjectId)`) to filter against the array instead. Keep `teacherOfferings` (subject+stage+price, already many-per-teacher) as-is — this is about which subjects a teacher may create *courses* under, a separate concern from pricing offerings.
- Dependencies: TASK-1903, TASK-803 (course creation subject filter)
- Affected modules: `lib/server/repositories/teacherProfileRepository.ts`, `lib/validation/account.schema.ts`, `lib/server/services/accountService.ts`, `components/admin/teacher-manager.tsx`, `app/[locale]/(protected)/teacher/courses/page.tsx`, `database/collections.md`
- Status: Done

> `teacherProfiles.subjectId` (single string) is now `subjectIds`
> (string array) end to end: the repository (`TeacherProfileDoc`,
> reads/writes, plus a `normalizeSubjectIds` fallback so any pre-
> migration doc still carrying a legacy single `subjectId` string keeps
> working), `account.schema.ts` (`createAccountSchema`/
> `updateTeacherProfileSchema`), `accountService.createAccountByAdmin`,
> and `teacherManagementService.updateTeacherProfile` all carry the
> array through. `database/collections.md` already documented the
> target `subjectIds: string[]` shape, so no change was needed there.
> The Admin's Teacher create/edit dialogs (`teacher-manager.tsx`) now
> render one `Checkbox` per subject instead of a single `Select`, and
> the teachers table's subject column joins every selected subject's
> localized name. `teacher/courses/page.tsx`'s "narrow to the
> teacher's own assigned subject(s)" filter and the same filter on
> `teacher/dashboard/page.tsx`'s schedule form now check
> `subjectIds.includes(...)` instead of an exact single-id match — both
> read sites, not just the one named in this task's affected-modules
> list, since they shared the same now-removed field.
> `teacherDirectoryService`'s two read sites (`listMyTeachers`,
> `getTeacherCoursesForStudent`) pick the first of a teacher's
> `subjectIds` for the single `subjectName` a directory card shows —
> unchanged surface, updated source field; its test fixtures were
> updated to `subjectIds: [...]` accordingly.
> Kept `teacherOfferings` untouched, per the task's explicit note — it
> was already many-per-teacher and is a separate (pricing) concern.
> Removed the now-unused `adminDashboard.teachers.fields.selectSubject`
> message key from `en.json`/`ar.json` (the single-select placeholder
> it labelled no longer exists); `fields.subjects` ("Subjects they
> teach") already reads fine as the checkbox-group label unchanged.
> Could not run the test suite or `tsc` — no `node_modules`/network in
> this sandbox (same limitation noted on TASK-2401); did a bracket-
> balance pass on every edited file instead.

## TASK-2403: Per-teacher student drill-down (Admin)
- Description: From the Admin's Teacher detail (or the existing center-wide Student list, filterable by teacher), show the same "this teacher's students, their courses, progress" view the teacher already sees of their own (`StudentList`/`student-detail-view.tsx`, TASK-1002), reused read-only for an Admin session. `studentService.listStudents`/`studentManagementService` already accept an Admin session per the existing ownership model (repositories don't scope Admin reads) — this is mostly a UI entry point (a "View students" action on a teacher row) plus confirming the service layer's Admin path is exercised by a route + test.
- Dependencies: TASK-1903, TASK-1001
- Affected modules: `components/admin/teacher-manager.tsx` (new action → link), `app/[locale]/(protected)/admin/teachers/[teacherId]/students/page.tsx` (new)
- Status: Done

> `studentService.listStudents`/`getStudentDetail` gained an optional
> `teacherId` param (not in this task's original affected-modules list,
> but required to make the "per-teacher" part real): an Admin session
> hits `scopeToTeacher`'s bypass and would otherwise see every
> teacher's students combined, so `teacherId` filters the unscoped
> enrollment read down to one teacher. A `teacher` session ignores the
> param — `scopeToTeacher` already scopes those queries to
> `session.uid`, and a teacher has no route to pass another teacher's
> id anyway.
> `StudentList` (TASK-1002) picked up an optional `basePath` prop
> (defaults to `/teacher/students`, unchanged for the teacher's own
> page) so its row links can point into the Admin route instead of the
> teacher-only one; `StudentDetailView` needed no changes — it was
> already just props in, markup out.
> Two new pages, not one — the task named `student-detail-view.tsx` as
> reused alongside `StudentList`, which only makes sense with a second,
> nested route: `admin/teachers/[teacherId]/students/page.tsx` (the
> list, via `StudentList`) and `admin/teachers/[teacherId]/students/
> [studentId]/page.tsx` (the detail, via `StudentDetailView`) — both
> `notFound()`-on-`NotFoundError`, mirroring `teacher/students/
> [studentId]/page.tsx`'s existing pattern. Both read
> `teacherManagementService.getTeacherDetail` first for the teacher's
> name (breadcrumb/heading) and to 404 on an unknown `teacherId` before
> touching `studentService` at all.
> Added a "View students" row action to `TeacherManager` linking to
> `/admin/teachers/{uid}/students`; no server-side API route was added
> for this — both pages read the services directly, same as
> `admin/courses/page.tsx` (TASK-2401) does for its own initial load.
> No create-a-student form on either new page — stays teacher-owned
> (`StudentManager`, TASK-1000), per the existing ownership model.
> New `adminDashboard.teachers.viewStudents`/`studentsPageTitle`
> message keys (`en.json`/`ar.json`); key parity checked by hand (no
> `node_modules` for `scripts/check-translations.ts`).
> `studentService.test.ts` covers the new `teacherId` narrowing on both
> `listStudents` and `getStudentDetail` (an Admin scoped to one teacher
> doesn't see another teacher's students, and a teacher session ignores
> the param since it's already scoped). Could not run the suite or
> `tsc` — no `node_modules`/network in this sandbox (same limitation
> noted on TASK-2401/2402); did a bracket-balance pass on every edited
> file instead.
