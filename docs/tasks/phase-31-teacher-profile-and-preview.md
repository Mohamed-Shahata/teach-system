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
- Status: Not Started

## TASK-3102: Teacher-facing "edit my profile" page
- Description: A form (own page, not a modal buried in settings) where a teacher fills in/edits the TASK-3101 fields. Nudge toward completion (e.g. a visible "profile completeness" indicator) since this is what's shown to students, without hard-blocking teacher functionality if left incomplete.
- Dependencies: TASK-3101
- Affected modules: `app/api/teacher/profile/route.ts` (extend existing or new), `app/[locale]/(protected)/teacher/profile/page.tsx`, `components/teacher/*`
- Acceptance criteria: teacher can view and update every TASK-3101 field; changes reflect immediately on the public/student-facing profile (TASK-3203).
- Testing requirements: API route tests for get/update; component test for the form.
- Documentation requirements: `docs/features/teacher-profile.md` (new) or extend an existing teacher-dashboard doc.
- Status: Not Started

## TASK-3103: Profile icon in the nav bar routes to the teacher's own profile
- Description: The nav bar's profile/avatar icon currently has no destination for teachers (or goes somewhere generic). Clicking it should open TASK-3102's edit page when the signed-in user is a teacher.
- Dependencies: TASK-3102
- Affected modules: `components/layout/*nav*`
- Acceptance criteria: nav bar profile icon is a working link to `/teacher/profile` for a teacher session.
- Testing requirements: component test for the nav link target per role.
- Documentation requirements: none beyond TASK-3102's doc.
- Status: Not Started

## TASK-3104: Course preview before publish
- Description: A "Preview" action on the course editor renders the course exactly as a student would see it (same components as the student-facing course view, TASK-3202/3203) without changing `status` from `draft`, and without requiring an enrollment/payment check to gate it for the owning teacher.
- Goal: A teacher can catch layout/content problems before students ever see the course.
- Dependencies: TASK-3202 (student-facing course detail view, reused here)
- Affected modules: `components/teacher/course-editor*`, a shared course-detail rendering component reused by both teacher-preview and student views
- Acceptance criteria: preview renders lessons, free/preview flags (TASK-3105), pricing exactly as the student view would; preview is never reachable by anyone other than the owning teacher/Admin; previewing a draft course does not publish it.
- Testing requirements: authorization test (only owner/Admin can preview a draft course); rendering test comparing preview output to the real student view for the same data.
- Documentation requirements: `docs/features/courses.md` gets a "Preview" section.
- Status: Not Started

## TASK-3105: Per-lesson "free preview" flag
- Description: Add `lessons.isFreePreview` (boolean, default `false`). A course can have some lessons marked free-preview so a non-enrolled/non-subscribed student can watch them (e.g. the first lesson or two) to evaluate the teacher's style before paying; every other lesson stays gated behind enrollment/payment exactly as today.
- Dependencies: none beyond existing `lessons`/`courses` (Phase 9)
- Affected modules: `lib/validation/lesson.schema.ts`, `lib/server/repositories/lessonRepository.ts`, `lib/server/services/lessonService.ts` (the access-check that currently gates lesson content by enrollment needs an `isFreePreview` bypass), `components/teacher/lesson-manager.tsx` (toggle in the UI), `docs/database/collections.md`
- Acceptance criteria: a lesson flagged `isFreePreview: true` is playable by any authenticated student regardless of enrollment; all other lessons remain gated exactly as before; the flag is teacher/Admin-settable only.
- Testing requirements: access-control unit tests for both flagged and unflagged lessons, enrolled and non-enrolled student.
- Documentation requirements: `docs/database/collections.md` `lessons` table; `docs/features/lessons.md`.
- Status: Not Started

## TASK-3106: Exam preview before publish
- Description: Same idea as TASK-3104 but for `quizzes` — a teacher can preview a draft exam exactly as a student attempting it would see it (question order, options, layout) without it counting as a real attempt and without changing `status` from `draft`.
- Dependencies: none beyond Phase 12/21 (quizzes)
- Affected modules: `components/teacher/exam*`, quiz-taking UI component reused in preview mode (no `quizAttempts` doc written)
- Acceptance criteria: preview renders every question exactly as the student-facing exam-taking flow would; submitting inside preview mode does not create a `quizAttempts` document; only the owning teacher/Admin can preview a draft exam.
- Testing requirements: authorization test; a test asserting no `quizAttempts` doc is created from a preview submission.
- Documentation requirements: `docs/features/exams.md` (or wherever exam docs live) gets a "Preview" section.
- Status: Not Started
