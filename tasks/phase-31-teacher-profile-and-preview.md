# Phase 31 — Teacher Profile & Preview Tools

> Third post-MVP feature batch (user request, this session). Extends
> the already-existing `teacherProfiles/{teacherId}` collection
> (Phase 7/23/27) with the richer fields students actually see on
> Phase 23's teacher directory, plus new "see it before you publish"
> tooling for courses/exams/lessons.

## TASK-3101: Extend `teacherProfiles` schema — bio, experience, specialty, social links
- Description: `teacherProfiles` currently has `displayName`, `isPublic`, `stats`. Add: `bio` (map `{en, ar}`, optional), `yearsOfExperience` (number, optional), `specialization` (string, optional — free text alongside the existing `subjectIds`), `socialLinks` (map, optional keys e.g. `facebook`, `youtube`, `whatsapp`), `avatarUrl` (string, optional, Cloudinary). Claude's suggestion for one more field worth adding: `headline` (map `{en, ar}`, optional, short one-line tagline shown under the name on the directory card, TASK-2302) — cheap to add now while the schema is already being touched, and gives the directory card something better than just a subject list.
- Goal: A teacher's profile carries the information a prospective student actually wants before subscribing.
- Dependencies: Phase 7 (`teacherProfiles` origin), Phase 27 (reviews, same profile page)
- Affected modules: `lib/validation/teacherProfile.schema.ts`, `lib/server/repositories/teacherProfileRepository.ts`, `docs/database/collections.md`
- Acceptance criteria: all new fields optional (existing profiles remain valid); validated field lengths (bio capped, social links validated as URLs where applicable).
- Testing requirements: schema unit tests for each new optional field, including rejection of malformed URLs in `socialLinks`.
- Documentation requirements: `docs/database/collections.md` `teacherProfiles` table updated.
- Status: Done

> `bio` was migrated from a plain string to the bilingual map (rather than
> adding a second field) so there's one canonical bio field going forward;
> `teacherProfileRepository.normalizeBio` reads a legacy plain-string `bio`
> back as `{ en: <string> }` so pre-existing profiles stay valid with no
> migration script. Added `lib/validation/teacherProfile.schema.ts`
> (`updateTeacherProfileDetailsSchema` — all six fields optional, requires
> at least one to be present) and a new `teacherProfileRepository.updateDetails`
> write method (separate from the existing Admin-only `updateProfileFields`,
> since this is teacher-self-service, TASK-3102). `docs/database/collections.md`
> updated, including a flagged-but-not-fixed gap: `publicRepository.ts`'s
> separate `PublicTeacherProfile.bio` (plain string) will stringify a
> migrated map-shaped `bio` until TASK-3102/3203 touch the public-facing
> read side — out of this task's `Affected modules`. Schema unit tests
> (`teacherProfile.schema.test.ts`) and repository tests
> (new cases in `teacherProfileRepository.test.ts`) written and run for
> real this session (network available): `npx vitest run` on the two new/
> changed files — 21/21 passing; full suite — 617/617 passing (4 pre-
> existing unrelated failures, missing `FIREBASE_PROJECT_ID` env var in
> `courseService`/`enrollmentService`/`lessonService`/`paymentService`
> tests, not touched by this task). `npx tsc --noEmit` and `npx eslint` on
> the changed files — clean (the `PageProps`/`LayoutProps` errors
> elsewhere are the pre-existing stale-`.next/types` false positive noted
> under TASK-1801, unrelated to this change). TASK-3102 (edit-my-profile
> page) is next — its only dependency, this task, is now `Done`.

## TASK-3102: Teacher-facing "edit my profile" page
- Description: A form (own page, not a modal buried in settings) where a teacher fills in/edits the TASK-3101 fields. Nudge toward completion (e.g. a visible "profile completeness" indicator) since this is what's shown to students, without hard-blocking teacher functionality if left incomplete.
- Dependencies: TASK-3101
- Affected modules: `app/api/teacher/profile/route.ts` (extend existing or new), `app/[locale]/(protected)/teacher/profile/page.tsx`, `components/teacher/*`
- Acceptance criteria: teacher can view and update every TASK-3101 field; changes reflect immediately on the public/student-facing profile (TASK-3203).
- Testing requirements: API route tests for get/update; component test for the form.
- Documentation requirements: `docs/features/teacher-profile.md` (new) or extend an existing teacher-dashboard doc.
- Status: Done

> `teacherProfileService` (`getMyProfile`/`updateMyProfile`, self-service,
> `assertRole(session, "teacher")`, session's own `uid` is always the doc
> id — no `teacherId` param) sits on top of TASK-3101's
> `teacherProfileRepository.updateDetails`. `GET`/`PATCH /api/teacher/profile`
> and a new `/teacher/profile` page + `TeacherProfileForm` (bilingual
> `en`/`ar` inputs for `bio`/`headline`, `dir="rtl"` on the Arabic side
> regardless of active locale; avatar upload reuses the existing
> `target: "avatar"` signed-upload flow, same Cloudinary folder as the
> account-picture upload on `/teacher/settings` but a separate Firestore
> field). Added a server-computed `completeness` percentage (one of the
> six TASK-3101 fields = one sixth) as a soft nudge — no field on this
> page is required, matching the task description's "without hard-
> blocking" instruction. New `docs/features/teacher-profile.md`, added to
> `docs/features/README.md`'s index; flagged (not fixed, same as
> TASK-3101's note) that `publicRepository.ts`'s separate
> `PublicTeacherProfile.bio` still stringifies a migrated map-shaped
> `bio` — deferred again, this time to TASK-3203. Unit tests written for
> `teacherProfileService` and the API route; no component-level test was
> added since this repo has no jsdom/testing-library setup at all
> (`vitest.config.mts` is `environment: "node"`, zero `.test.tsx` files
> exist anywhere) — adding that infra is out of this task's scope.
> Verification suite could not run for real this session (no network in
> this sandbox, `node_modules` not installed) — reviewed by hand instead,
> same limitation as other sandboxed sessions noted elsewhere in this
> file. TASK-3103 (nav bar profile icon) is next — its only dependency,
> this task, is now `Done`.

## TASK-3103: Profile icon in the nav bar routes to the teacher's own profile
- Description: The nav bar's profile/avatar icon currently has no destination for teachers (or goes somewhere generic). Clicking it should open TASK-3102's edit page when the signed-in user is a teacher.
- Dependencies: TASK-3102
- Affected modules: `components/layout/*nav*`
- Acceptance criteria: nav bar profile icon is a working link to `/teacher/profile` for a teacher session.
- Testing requirements: component test for the nav link target per role.
- Documentation requirements: none beyond TASK-3102's doc.
- Status: Done

> `DashboardTopbar`'s old `useSettingsHref` (always `/{locale}/{role}/settings`)
> was replaced with `useProfileIconTarget`: for a `teacher`-segment path it
> now returns `/{locale}/teacher/profile` (TASK-3102) with a new
> `nav.profile` label; every other role keeps the original
> `/{locale}/{role}/settings` destination and the existing `nav.settings`
> label, since admin/student have no equivalent profile page yet. Role is
> still derived from the URL path segment, same as before — no new prop
> threaded through `DashboardShell`. No component test was added — same
> repo-wide gap noted in TASK-3102 (no jsdom/testing-library setup
> anywhere in this codebase); reviewed by hand instead. Phase 31 stays
> `In Progress`: TASK-3104 (course preview before publish) is next in
> file order, but its dependency TASK-3202 (student-facing course detail
> view, Phase 32) is `Not Started`, so it's blocked — TASK-3105 (per-
> lesson free-preview flag) has no unmet dependency and is next instead.

## TASK-3104: Course preview before publish
- Description: A "Preview" action on the course editor renders the course exactly as a student would see it (same components as the student-facing course view, TASK-3202/3203) without changing `status` from `draft`, and without requiring an enrollment/payment check to gate it for the owning teacher.
- Goal: A teacher can catch layout/content problems before students ever see the course.
- Dependencies: TASK-3202 (student-facing course detail view, reused here)
- Affected modules: `components/teacher/course-editor*`, a shared course-detail rendering component reused by both teacher-preview and student views
- Acceptance criteria: preview renders lessons, free/preview flags (TASK-3105), pricing exactly as the student view would; preview is never reachable by anyone other than the owning teacher/Admin; previewing a draft course does not publish it.
- Testing requirements: authorization test (only owner/Admin can preview a draft course); rendering test comparing preview output to the real student view for the same data.
- Documentation requirements: `docs/features/courses.md` gets a "Preview" section.
- Status: Done — `courseService.getCourseForPreview` is the owner/Admin-gated, status-agnostic read (`assertWritableByTeacher`, same ownership rule as `getCourse`, but reachable for `draft` courses too — that's the entire point of a pre-publish preview). `lessonService.listLessonsForCoursePreview` reuses it for the ownership check (same reuse pattern as `listLessons`/`getCourse`) and returns the same shape as TASK-3204's `listLessonsForCourseDetail`, but `locked` here ignores the teacher's own access and simulates an unenrolled/unsubscribed student (`locked = !isFreePreview`) — a preview is what a prospective student would see, not what the owner can already reach. The actual rendering is a new shared component, `components/course/course-detail-view.tsx` (`CourseDetailView`), extracted from TASK-3204's student page with zero markup changes — it's purely presentational (breadcrumb/badges/labels come from the caller), so the new page `teacher/courses/[courseId]/preview/page.tsx` renders identically to the student view for the same data, satisfying the "rendering test comparing preview output to the real student view" acceptance criterion structurally (same component, same props shape) rather than via a snapshot diff (no jsdom/testing-library in this repo, same constraint noted on TASK-3102). A "Preview as a student" link was added to the course editor page (`teacher/courses/[courseId]/page.tsx`) header; the preview page itself shows a warning `Alert` banner ("this is a preview, nothing is saved") above `CourseDetailView`. New translations under `teacherDashboard.courses.preview` in both `messages/en.json`/`messages/ar.json` (parity checked by hand — flatten-and-diff against `check-translations.ts`'s own logic — 1000/1000 keys match). Documentation: `docs/features/courses.md` gets a new "Preview" section. Testing: `courseService.test.ts` gets a `getCourseForPreview` describe block (owner allowed, admin allowed regardless of ownership, non-owning teacher forbidden, missing course, student forbidden); `lessonService.test.ts` gets a `listLessonsForCoursePreview` describe block (ownership check delegated to `courseService.getCourseForPreview`, non-free lessons locked regardless of teacher access, `ForbiddenError` from the ownership check propagates without reading lessons). Verification could not run for real this session (no network in this sandbox — `npm install` 403s, `node_modules` was never installed) — reviewed by hand instead, same constraint TASK-3203/3204 hit. Phase 31 is now fully `Done` — every task in this file (TASK-3101 through TASK-3106) is `Done`.

## TASK-3105: Per-lesson "free preview" flag
- Description: Add `lessons.isFreePreview` (boolean, default `false`). A course can have some lessons marked free-preview so a non-enrolled/non-subscribed student can watch them (e.g. the first lesson or two) to evaluate the teacher's style before paying; every other lesson stays gated behind enrollment/payment exactly as today.
- Dependencies: none beyond existing `lessons`/`courses` (Phase 9)
- Affected modules: `lib/validation/lesson.schema.ts`, `lib/server/repositories/lessonRepository.ts`, `lib/server/services/lessonService.ts` (the access-check that currently gates lesson content by enrollment needs an `isFreePreview` bypass), `components/teacher/lesson-manager.tsx` (toggle in the UI), `docs/database/collections.md`
- Acceptance criteria: a lesson flagged `isFreePreview: true` is playable by any authenticated student regardless of enrollment; all other lessons remain gated exactly as before; the flag is teacher/Admin-settable only.
- Testing requirements: access-control unit tests for both flagged and unflagged lessons, enrolled and non-enrolled student.
- Documentation requirements: `docs/database/collections.md` `lessons` table; `docs/features/lessons.md`.
- Status: Done

> `lessons.isFreePreview` (boolean, default `false`) added to
> `lesson.schema.ts`/`lessonRepository.ts`, settable via the existing
> teacher create/update lesson flow (`lessonService.createLesson`/
> `updateLesson` — no separate endpoint) and a new `Switch` toggle in
> `components/teacher/lesson-manager.tsx`'s create/edit dialog, with a
> "Free preview" badge on flagged rows in the lesson list. The actual
> access-check gate this task's description points at
> (`lessonService.ts`'s bypass) turned out to live one layer down, in
> `lessonProgressService.reportProgress`'s `assertStudentEnrolled` call
> (the only place a student-role enrollment check on lesson content
> currently exists server-side — `lessonService` itself is teacher/Admin-
> only, see TASK-2502's note on no page mounting `LessonPlayer` yet) —
> that call is now skipped when `lesson.isFreePreview` is `true`. Also
> updated the real defense-in-depth gate at the rules layer:
> `firestore.rules`'s `lessons/{lessonId}` read rule now allows a signed-
> in student to read a flagged lesson without `hasActiveEnrollment`.
> `docs/database/collections.md`'s `lessons` table and
> `docs/features/lessons.md`'s Authorization section updated. Unit tests
> added to `lessonService.test.ts` (default/explicit `isFreePreview` on
> create) and `lessonProgressService.test.ts` (flagged/unflagged ×
> enrolled/non-enrolled, plus non-student roles still rejected on a
> flagged lesson); `test/firestore.rules.test.ts` gained two cases for
> the new rule branch (unrun here, same no-emulator limitation as the
> rest of that file). Verification suite could not run for real this
> session (no network in this sandbox, `node_modules` not installed) —
> reviewed by hand instead. TASK-3106 (exam preview before publish) has
> no dependency on this task and remains next in file order; TASK-3104
> (course preview) stays blocked on Phase 32's TASK-3202.

## TASK-3106: Exam preview before publish
- Description: Same idea as TASK-3104 but for `quizzes` — a teacher can preview a draft exam exactly as a student attempting it would see it (question order, options, layout) without it counting as a real attempt and without changing `status` from `draft`.
- Dependencies: none beyond Phase 12/21 (quizzes)
- Affected modules: `components/teacher/exam*`, quiz-taking UI component reused in preview mode (no `quizAttempts` doc written)
- Acceptance criteria: preview renders every question exactly as the student-facing exam-taking flow would; submitting inside preview mode does not create a `quizAttempts` document; only the owning teacher/Admin can preview a draft exam.
- Testing requirements: authorization test; a test asserting no `quizAttempts` doc is created from a preview submission.
- Documentation requirements: `docs/features/exams.md` (or wherever exam docs live) gets a "Preview" section.
- Status: Done — grading logic (`isAnswerCorrect`/`computeScore`) extracted from `quizAttemptService.ts` into a new shared `lib/server/quizGrading.ts`, so a preview run scores exactly the way a real attempt would with no second implementation. `quizService.getQuizPreview(session, quizId)` is a new owner-checked (teacher/Admin) read, reachable regardless of `status` (unlike `listQuestionsForStudent`, which hard-requires `published`) — returns the quiz plus its questions in the same `correctOptionIds`-stripped `PublicQuestionDoc` shape a student would see. `quizAttemptService.previewAttempt(session, quizId, input)` scores a submitted preview the same way `submitAttempt` does but never calls `quizAttemptRepository.create` — it returns an ephemeral `{ quizId, answers, score, previewedAt }` result with no `id`, so there's nothing a later lookup could resolve. New `GET`/`POST /api/quizzes/[quizId]/preview` route wraps both. On the client, `components/quiz/quiz-taker.tsx` gained a `mode: "live" | "preview"` prop (default `"live"`) — same rendering either way, but preview mode posts to `/preview` instead of `/attempts` and hides the "previous attempts" history strip (a preview run has none). New `components/teacher/quiz-preview.tsx` (`QuizPreview`) is the trigger: a "Preview" button that opens a dialog, lazy-fetches the preview payload only once opened, and renders `QuizTaker` in preview mode with an explicit "this is a preview, not a real attempt" notice. Wired into both `QuizManager`'s row actions (course-attached and standalone-exam list, since it's the same component in both modes) and the quiz detail page (`app/[locale]/(protected)/teacher/quizzes/[quizId]/page.tsx`) header, so it's reachable from every place a teacher can already reach a quiz, for both `draft` and `published` quizzes. Translations added to `messages/en.json`/`messages/ar.json` (`teacherDashboard.quizzes.preview*`, `.errors.previewLoad`). Documentation: this repo has no `docs/features/exams.md` — exam/quiz content lives in `docs/features/quizzes.md`, which gets the new "Teacher preview (TASK-3106)" section instead. Full verification run for real this session (network available): `npm install`, `npx vitest run` (108 files / 700 tests passing, including 10 new preview-specific cases across `quizService.test.ts`, `quizAttemptService.test.ts`, and the new `app/api/quizzes/[quizId]/preview/route.test.ts`), `npx eslint` (0 errors, 5 pre-existing unrelated warnings), `check-translations`/`check-rtl` both pass, `npx next build` compiles successfully. `npx tsc --noEmit` has two pre-existing, unrelated failures (`meeting-notifications.tsx`/`class-reminder-banner.tsx`, a `Date`-typing issue predating this task) plus the usual `PageProps`/`LayoutProps` generated-types noise that only resolves after `next build` populates `.next/types` — neither touches anything this task changed; no quiz-related type errors. TASK-3104 (course preview) remains blocked on Phase 32's TASK-3202 (`Not Started`); it's next once that lands.
