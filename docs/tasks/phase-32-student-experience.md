# Phase 32 — Student Profile, My Courses & Teachers Directory Revamp

> Third post-MVP feature batch (user request, this session). Builds on
> Phase 11 (enrollment), Phase 23 ("My Teachers" directory), and
> Phase 25 (watch progress) — no student-facing profile collection
> exists yet, and the teacher-directory naming/nesting needs rework
> per the user's explicit spec.

## TASK-3201: Student profile — age, current stage, name, photo
- Description: Add a simple student-facing profile: editable `displayName` (already exists on `users`), `avatarUrl` (Cloudinary, optional — add to `users` schema if not already present for students), and a derived/display `age` field. Age: rather than storing a raw age that goes stale, store `birthDate` (optional date) and compute age server-side for display — flagged here as Claude's suggestion over a raw `age` number, open for the user to override if a raw number is preferred. `stageId` already exists on `users` for students (Phase 10) and is shown read-only here (changing grade level is an Admin action, not self-service, to keep enrollment/subscription data consistent).
- Goal: A student has a lightweight profile of their own, not just an account record.
- Dependencies: Phase 10 (`users.stageId` for students)
- Affected modules: `lib/validation/user.schema.ts` (or student-specific profile schema), `lib/server/repositories/userRepository.ts`, `app/api/student/profile/route.ts` (new), `app/[locale]/(protected)/student/profile/page.tsx` (new), `components/student/*`
- Acceptance criteria: student can view/edit `displayName`, `avatarUrl`, `birthDate`; `stageId` shown but not editable by the student.
- Testing requirements: API route tests for get/update including the read-only `stageId` enforcement; schema tests for `birthDate` validation.
- Documentation requirements: `docs/database/collections.md` `users` table gets `birthDate`/`avatarUrl` rows if not already present.
- Status: Not Started

## TASK-3202: "My Courses" — student's enrolled courses with continue/resume
- Description: A student-facing page/section listing every course the student has an active enrollment in, each card showing progress (reusing Phase 25's `lessonProgress`/`enrollments.progress.percent`) and a "Continue" action that opens the course at the next incomplete lesson.
- Dependencies: Phase 11 (enrollments), Phase 25 (progress tracking)
- Affected modules: `app/api/student/courses/route.ts` (new or extend existing dashboard endpoint), `app/[locale]/(protected)/student/courses/page.tsx`, `components/student/*`
- Acceptance criteria: only actively-enrolled courses appear; clicking a course (or "Continue") opens the course/lesson player at the correct resume point.
- Testing requirements: API test scoping results to the caller's own enrollments; UI test for the resume-point calculation.
- Documentation requirements: `docs/features/enrollment.md` or a new `docs/features/student-dashboard.md`.
- Status: Not Started

## TASK-3203: Rename "My Teachers" → "Teachers", nested "My Teachers" tab, teacher account view
- Description: Restructure Phase 23's directory. The top-level student nav item becomes **Teachers** (every teacher in the system, per Phase 23's existing directory service — TASK-2301/2302 already build this list, this task only renames/re-scopes the page-level entry point). Inside it, a **My Teachers** tab filters to only the teachers the student is subscribed to (existing `subscriptions` data, Phase 29). Clicking any teacher (from either tab) opens that teacher's account/profile view: the TASK-3101 profile fields, plus the list of courses that teacher offers.
- Dependencies: TASK-2301, TASK-2302, TASK-3101, Phase 29 (subscriptions, for the "My Teachers" filter)
- Affected modules: `app/[locale]/(protected)/student/teachers/page.tsx` (rename/restructure from `my-teachers`), `components/student/*`, nav label
- Acceptance criteria: nav item reads "Teachers"; page defaults to (or clearly offers) the full directory; a "My Teachers" tab filters to subscribed teachers only; clicking a teacher opens their profile.
- Testing requirements: component test for tab filtering logic; route test confirming the renamed path (with a redirect from the old path if one existed, to avoid breaking bookmarks).
- Documentation requirements: update whatever doc described the old "My Teachers" page (Phase 23's feature doc, if any) to reflect the new structure.
- Status: Not Started

## TASK-3204: Course detail view from a teacher's account page — access-gated content
- Description: From TASK-3203's teacher account view, clicking one of the teacher's courses shows course details (title, description, lesson count, price) to any student, but lesson **content** (video/files) is only playable if the student is enrolled/subscribed, OR the specific lesson is flagged `isFreePreview` (TASK-3105). Non-eligible students see the course structure (lesson titles/count) but a locked state on gated lessons.
- Dependencies: TASK-2303 (existing "teacher courses view, scoped to enrollment" — this task extends it to the general/non-enrolled case), TASK-3105
- Affected modules: `app/api/student/courses/[courseId]/route.ts` (or wherever course detail is served), student course-detail UI
- Acceptance criteria: any authenticated student can see a course's metadata + lesson list; only enrolled/subscribed students or free-preview lessons are playable; attempting to fetch a gated lesson's video URL directly (API-level) is rejected server-side, not just hidden in the UI.
- Testing requirements: authorization tests for enrolled, subscribed, non-enrolled, and free-preview-lesson cases, at the API layer (not just UI).
- Documentation requirements: `docs/features/lessons.md`, `docs/features/enrollment.md`.
- Status: Not Started

## TASK-3205: Student weekly schedule page
- Description: A dedicated page listing every one of the student's classes across the week (derived from the `schedule` docs of every teacher the student is subscribed to), laid out as a clean weekly timetable (days as columns or rows, time slots), matching the app's existing design system/tokens rather than a generic table.
- Dependencies: Phase 6 (`schedule` collection), Phase 29 (subscriptions determine which slots are "the student's")
- Affected modules: `app/api/student/schedule/route.ts` (new), `app/[locale]/(protected)/student/schedule/page.tsx` (new), `components/student/*`
- Acceptance criteria: shows every schedule slot for every teacher the student is subscribed to, grouped/sorted by day and time; visually consistent with `docs/design-system`.
- Testing requirements: API test scoping slots to the caller's subscriptions; a visual/consistency check against the design-system doc (manual or snapshot).
- Documentation requirements: `docs/features/schedule.md` (new or extend existing).
- Status: Not Started
