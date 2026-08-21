# Task Breakdown

Work proceeds task-by-task per phase, in dependency order. Each phase has
its own file (`phase-01-foundation.md` ... `phase-18-mvp-finalization.md`)
with tasks in this shape:

```text
Task ID
Title
Description
Goal
Dependencies
Affected modules
Acceptance criteria
Testing requirements
Documentation requirements
Status: Not Started | In Progress | Blocked | Done
```

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | Project Foundation | Done |
| 2 | Design System | Done |
| 3 | Internationalization | Done |
| 4 | Authentication | Done |
| 5 | Authorization | Done |
| 6 | Ownership & Access Rules (Center: Admin + Teachers) | Done |
| 7 | Teacher Dashboard | Done |
| 8 | Course Management | Done |
| 9 | Lesson Management | Done |
| 10 | Student Management | Done |
| 11 | Enrollment | In Progress |
| 12 | Quiz / Exam System | Done |
| 13 | File Management | Done |
| 14 | Public Pages | Done |
| 19 | Admin Dashboard & System Analytics | Done |
| 20 | Automated Class Notifications | Done |
| 21 | Stage-Wide Exams & Manual Grading | Done |
| 22 | Lesson Video Upload Widget | Done |
| 23 | "My Teachers" (Student-Facing) | Done |
| 24 | Admin Oversight Enhancements | Done |
| 25 | Lesson Watch-Progress Tracking | Done |
| 26 | Real Push Notifications (FCM / Web Push) | Done |
| 27 | Student Reviews & Ratings for Teachers | Done |
| 28 | Exam Results Export (PDF / Excel) | Done |
| 29 | Teacher Subscriptions & Offerings | Done |
| 30 | Notifications UX & Delivery Coverage | Done |
| 31 | Teacher Profile & Preview Tools | Done |
| 32 | Student Profile, My Courses & Teachers Directory Revamp | Done |
| 33 | Admin Overview, Analytics & Reporting | Done |
| 34 | Admin Manual Payments & Subscription Oversight | Done |
| 35 | Consolidated Table Action Menus | Done |
| 36 | Caching Strategy & Performance | Not Started |
| 15 | Security | In Progress |
| 16 | Testing | In Progress |
| 17 | Deployment | Not Started |
| 18 | MVP Finalization | In Progress |

> Phases 20–24 were added after the initial 18-phase roadmap + Phase 19,
> at the user's request (post-MVP feature batch). They build on already-
> shipped foundations (Phase 6's notifications, Phase 12's quizzes, the
> Cloudinary upload pipeline, Phase 10/11's student-teacher relationship
> data, and Phase 19's admin dashboard) rather than introducing new core
> collections where an existing one already fits — see each phase file's
> intro note for exactly what it reuses. Phases 25–28 are a second
> post-MVP batch (Claude's own suggestions, accepted by the user) added
> the same way. No fixed ordering was requested within either batch —
> pick whichever unblocks the next thing you want to ship.

> Reordered: Phase 19 (Admin Dashboard) was pulled ahead of Phase 15
> (Security) at the user's request. Phases 20–28 (both post-MVP
> feature batches) were likewise placed ahead of Security/Testing/
> Deployment/MVP Finalization (15–18) — those four now close out the
> roadmap instead of sitting in the middle, per the user's request, since
> none of the new feature phases has a hard dependency on them. File
> names and TASK-ID numbering were left as originally assigned (e.g.
> `phase-15-security.md` still contains "Phase 15" and `TASK-15xx`) to
> avoid an invasive rename across cross-referenced docs — this table's
> row order is the actual intended working order, not the file numbers.

> Table corrected: Phase 19 was marked "In Progress" here but every one
> of its tasks (TASK-1901–1907) was already `Done` in its own phase
> file — a stale row, not real work. Phase 21 moved to "In Progress":
> TASK-2101 is now `Done`; TASK-2102–2105 remain `Not Started`.
>
> Phase 21 moved to "Done": TASK-2102–2105 landed (manual grading
> toggle, teacher grading UI, student-facing exam list, teacher-facing
> exam management) — all five tasks in the phase are now `Done`.
>
> Phase 22 moved to "Done": all three tasks (TASK-2201–2203) landed —
> signed video-upload support, the upload UI in the lesson form, and
> its progress/guardrails (the latter two shipped together, see
> TASK-2203's note in `phase-22-lesson-video-upload.md`).
>
> Phase 23 moved to "Done": all three tasks (TASK-2301–2303) landed —
> derived "my teachers" service + API route, the list page UI (+ sidebar
> nav entry), and the per-teacher courses view scoped to the student's
> own enrollment.
>
> Phase 24 moved to "In Progress": TASK-2401 (center-wide read-only
> course list) is now `Done`. TASK-2402 (multiple subjects per teacher)
> and TASK-2403 (per-teacher student drill-down) remain `Not Started`.
>
> Phase 15 moved to "In Progress": TASK-1501 (Firestore rules coverage
> for every remaining collection) and TASK-1502 (env-exposure guard
> script) are now `Done`. TASK-1503 (security review pass) is `Blocked`
> — it depends on "all feature phases" being `Done`, and Phases 6/11
> each still have one genuinely blocked task (no emulator; no payment
> gateway decision) — see `phase-15-security.md`'s note.
>
> Phase 28 moved to "Done": all four tasks (TASK-2801–2804) landed —
> `examReportService` (shared row/summary assembly + `pdfkit` PDF
> rendering + `exceljs` xlsx rendering), the
> `GET /api/exams/[examId]/export?format=pdf|xlsx` route, and the
> teacher-facing `ExamResultsPanel` (results table + Export dropdown)
> wired into the existing quiz/exam detail page.
>
> TASK-2402 (multiple subjects per teacher) is now `Done`:
> `teacherProfiles.subjectId` migrated to `subjectIds: string[]` across
> the repository, schema, account/teacher-management services, the
> Admin Teacher create/edit dialog (now a checkbox group), and both
> places that narrow a teacher's own subject list (`teacher/courses`
> and `teacher/dashboard`). TASK-2403 remains `Not Started`.
>
> Phase 24 moved to "Done": TASK-2403 (per-teacher student drill-down)
> landed — `studentService.listStudents`/`getStudentDetail` gained an
> optional `teacherId` narrowing param, `StudentList` gained a
> `basePath` prop, and two new Admin pages (list + nested detail, under
> `admin/teachers/[teacherId]/students`) reuse `StudentList`/
> `StudentDetailView` (TASK-1002) read-only, linked from a new "View
> students" action on `TeacherManager`'s rows. All three of this
> phase's tasks (TASK-2401–2403) are now `Done`.

> Phase 25 moved to "In Progress": TASK-2501 (`lessonProgress`
> collection — docs + rules) is now `Done`. TASK-2502–2504 (progress
> reporting endpoint/player, roll-up into `enrollment.progress`,
> teacher-facing view) remain `Not Started`.
>
> TASK-2502 (progress reporting endpoint/player) is now `Done`:
> `lessonProgressRepository`/`lessonProgressService` (student-only,
> `assertStudentEnrolled`-gated), `PATCH
> /api/lessons/[lessonId]/progress`, and a `LessonPlayer` component
> wrapping `VideoPlayer` with throttled `timeupdate`/`pause` reporting
> (native-`<video>` providers only — YouTube left as a follow-up).
> `watchedSeconds` is `max(existing, reported currentTime)`, not a
> client-trusted total. No page mounts `LessonPlayer` yet — that's not
> this task's scope. TASK-2503–2504 remain `Not Started`.
>
> TASK-2503 (roll watch-progress into `enrollment.progress`) is now
> `Done`: `enrollmentService.computeProgress` now averages
> manually-completed (100%) and per-lesson watch percentage (0–100%,
> from `lessonProgress`) across the course's lessons, instead of the
> old binary completed/total ratio. New `recalculateWatchProgress`
> keeps `completedLessonIds` untouched and is called from
> `lessonProgressService.reportProgress` so progress stays live as the
> student watches. TASK-2504 (teacher-facing per-student progress
> view) remains `Not Started`.
>
> Phase 25 moved to "Done": TASK-2504 (teacher-facing per-student
> progress view) landed — `studentService.getCourseStudentsProgress`
> (teacher-only, ownership-checked, reuses TASK-2503's exported
> `enrollmentService.watchPercent`), `GET
> /api/courses/[courseId]/students`, and `CourseStudentsPanel` (mounted
> on the teacher course detail page) showing each enrolled student's
> overall progress plus a per-lesson watch-percentage/"completed"
> breakdown. All four of this phase's tasks (TASK-2501–2504) are now
> `Done`.
>
> Phase 26 moved to "In Progress": TASK-2601 (FCM setup + service
> worker) is now `Done` — see `phase-26-push-notifications.md` for the
> full note, including why it's deliberately not wired into any UI yet.
> TASK-2602 (store device tokens) and TASK-2603 (server-side dispatch)
> remain `Not Started`; TASK-2602 is next (TASK-2601 is its only
> dependency and is now Done).
>
> TASK-2602 (store device tokens per user) is now `Done`:
> `fcmTokenRepository`/`fcmTokenService` +
> `POST`/`GET /api/notifications/fcm-tokens` +
> `DELETE /api/notifications/fcm-tokens/[tokenId]`, the
> `users/{uid}/fcmTokens/{tokenId}` subcollection documented in
> `database/collections.md`, and an owner-only `firestore.rules` entry.
> `firebaseMessaging.ts` gained `syncPushToken()` as the client-side
> caller — still unwired to any UI, same reasoning as TASK-2601.
> TASK-2603 (server-side push dispatch) remains `Not Started` and is
> next (its only dependency, TASK-2602, is now Done).
>
> TASK-2603 (server-side push dispatch on notification write) is now
> `Done`: new `pushRepository` (Admin SDK `sendEachForMulticast` wrapper)
> and `pushDispatchService` (groups by recipient, builds localized push
> copy, prunes dead tokens), called from both places that write
> `notifications` — `notificationService.sendMeetingLink` and
> `classNotificationsJob`'s two auto-fire paths. See
> `phase-26-push-notifications.md` for the full note, including why
> tokens aren't scoped by TASK-2604 yet. TASK-2604 (notification
> preferences) remains `Not Started` and is next (its only dependency,
> this task, is now `Done`).
>
> Phase 26 moved to "Done": TASK-2604 (per-user push on/off toggle)
> landed — `users/{uid}.pushEnabled` (+ `updatePushEnabled`), a
> `updatePushPreference` action on both `studentSettingsService`/
> `teacherSettingsService`, `PATCH /api/{student,teacher}/settings/push`,
> and a "Push notifications" `Switch` card on both settings forms that
> finally calls TASK-2601/2602's until-now-unwired
> `requestPushToken`/`syncPushToken`. `pushDispatchService` now skips any
> recipient with `pushEnabled === false` before reading their tokens. See
> `phase-26-push-notifications.md` for the full note, including why the
> affected-component filenames in the task description didn't match
> anything in the codebase. All four of this phase's tasks
> (TASK-2601–2604) are now `Done`.

> Phase 27 moved to "In Progress": TASK-2701 (`reviews` collection —
> docs + rules + index) is now `Done`. TASK-2702–2704 (submit/edit
> review UI, public display + average rating, moderation hook) remain
> `Not Started`; TASK-2702 is next (its only dependency, TASK-2701, is
> now `Done`).

> TASK-2702 (submit/edit review, student side) is now `Done`:
> `reviewService.upsertReview` (eligibility-gated on a non-`cancelled`
> enrollment with the teacher), `GET`/`PUT /api/teachers/[teacherId]
> /reviews/me`, and `TeacherReviewForm` mounted on the student-facing
> `student/teachers/[teacherId]` page (TASK-2303) — see
> `phase-27-teacher-reviews.md` for why that page and not the anonymous
> public one. TASK-2703 (public display + average rating) remains
> `Not Started` and is next (its only dependency, TASK-2701, is
> already `Done`).

> TASK-2703 (public display + average rating) is now `Done`:
> `reviewService.getPublicSummary` (computed-on-read average, capped
> newest-50 review list, student first-name-only) wired into
> `publicService.getTeacherPageBySlug` and rendered on
> `(public)/teachers/[slug]`. See `phase-27-teacher-reviews.md` for the
> file-path scope note and why pagination/denormalization were both
> deferred. TASK-2704 (moderation hook) remains `Not Started` and is
> next (its only dependency, this task, is now `Done`).

> Phase 27 moved to "Done": TASK-2704 (Admin moderation hook) landed —
> `reviewService.listForModeration`/`setHidden` (Admin-only),
> `GET /api/admin/teachers/[teacherId]/reviews` +
> `PATCH /api/admin/reviews/[reviewId]`, and `ReviewsPanel` on a new
> `admin/teachers/[teacherId]/reviews` page, linked from a "View
> reviews" row action on `TeacherManager` (mirrors TASK-2403's "View
> students" shape). Reviews are hidden, never deleted. All four of this
> phase's tasks (TASK-2701–2704) are now `Done`. Phase 28 (Exam Results
> Export) is next in the working order and has no dependency on this
> phase.

> Phase 18 moved to "In Progress": TASK-1801 (Definition of Done audit)
> is now `In Progress` (not `Done` — the network/browser-dependent
> checks remain blocked in this sandbox, same limitation as
> TASK-1601/1604). Found and fixed one real gap:
> `components/theme/theme-toggle.tsx` had a hardcoded English
> `aria-label` instead of the already-existing-but-unused
> `theme.toggleLabel` translation key. See
> `phase-18-mvp-finalization.md` for the full audit note. TASK-1802 and
> TASK-1803 remain `Not Started` — both depend on TASK-1801 finishing.

> TASK-1801 is now `Done`: the user ran `npm install`, `npx tsc
> --noEmit`, `npx eslint`, and `npx vitest run` on their own machine.
> `vitest` came back 639/639 tests passing across 104 files (confirms
> TASK-1601 for real); `eslint` came back 0 errors (fixed one genuine
> unused-import warning along the way, in
> `test/firestore.rules.test.ts`); `tsc --noEmit` initially showed 15
> errors, all traced to stale `.next/types` (no `next build` had run
> yet, so five newer dynamic routes fell back to `unknown` params) —
> re-running `npx next build` came back "Compiled successfully" /
> "Finished TypeScript in 8.1s" with zero errors and all 96 routes
> generated, confirming it wasn't a real defect. See
> `phase-18-mvp-finalization.md` for the full trail. TASK-1802
> (Documentation freshness pass) is next — its only dependency,
> TASK-1801, is now `Done`.

> TASK-1802 (Documentation freshness pass) is now `Done`: on top of the
> Phase 29 tracking gap and `docs/api/README.md` rewrite already noted
> in `phase-18-mvp-finalization.md`, all 12 `docs/features/*.md` files
> were cross-checked against the actual implementation — fixed a
> missing index entry (`admin-dashboard.md` wasn't listed in
> `features/README.md`) and three sections left stale by
> since-completed phases (`quizzes.md`'s Phase 21 status,
> `schedule.md`'s Phase 20 automation wording, `students.md`'s "My
> teachers" status). Found, but deliberately left open (out of this
> task's own scope, same as the subscriptions doc deferred to
> TASK-2910): Phases 26–28 (push notifications, teacher reviews, exam
> export) have no `docs/features/*.md` coverage at all — see
> `phase-18-mvp-finalization.md`'s TASK-1802 note for the full gap
> description. TASK-1803 (Future roadmap review) is next — its only
> dependency, TASK-1801, is already `Done`.
>
> Follow-up: the three missing feature docs flagged above are now
> written — `docs/features/push-notifications.md`,
> `docs/features/teacher-reviews.md`, and
> `docs/features/exam-results-export.md`. `docs/features/*.md` has full
> coverage for every `Done` phase except Phase 29 (subscriptions),
> still deferred to TASK-2910. See `phase-18-mvp-finalization.md`'s
> TASK-1802 note for why each got its own file rather than being folded
> into an existing one.

> Phase 13 gains a fourth task, TASK-1304 (Standalone teacher files
> page), added after finding the sidebar's "Files" nav entry permanently
> pointed at a "coming soon" placeholder — TASK-1303 had deliberately
> deferred a cross-course files view, but the dead link itself was never
> tracked or revisited. TASK-1304 is `Done`: `/teacher/files` now lists
> every file the signed-in teacher owns across all courses/lessons
> (search + delete, no separate upload — uploading stays per-lesson via
> the existing `LessonFileManager`). Full verification suite run for
> real this session (network was available): `next build`, `tsc
> --noEmit`, `eslint` all clean; `vitest run` 104/104 files, 640/640
> tests passing; `check-translations`/`check-rtl` both pass. See
> `phase-13-file-management.md`'s TASK-1304 note for the full detail.

> TASK-3203 (rename "My Teachers" → "Teachers", nested tab, teacher
> account view) is now `Done` — `teacherDirectoryService` gained
> `listTeacherDirectory` (every public teacher, flagged `subscribed` from
> Phase 29's `subscriptions`, replacing the old enrollment-scoped
> `listMyTeachers`) and `getTeacherAccountView` (renamed from
> `getTeacherCoursesForStudent`, no longer enrollment-gated, now also
> returns TASK-3101's profile-detail fields). New `teachers-directory.tsx`
> client component renders the All/My-Teachers tabs over one server-fetched
> list. See `phase-32-student-experience.md`'s TASK-3203 note for the full
> detail. Phase 32 stays `In Progress`: TASK-3204 (course detail view,
> access-gated content) is next — its dependencies (TASK-2303, TASK-3105)
> are already `Done`.

Before starting any task, follow `development/ai-agent-workflow.md`.

> Phase 29 gains a history note: TASK-2907 (`firestore.rules` coverage
> for `teacherOfferings`/`subscriptions`/`subscriptionInvoices`) is now
> `Done` — see `phase-29-teacher-subscriptions.md`'s TASK-2907 note for
> the rule shape and the (unrun, no-emulator-here) test coverage added
> to `test/firestore.rules.test.ts`. Phase 29 stays `In Progress`:
> TASK-2908 (Admin UI) and TASK-2909 (teacher/student invoice views)
> remain `Not Started`, with TASK-2908 next — its dependencies
> (TASK-2902, TASK-2904, TASK-2906) are already `Done`.

> TASK-2908 (Admin UI — offerings & subscriptions management) is now
> `Done`: two of its three pieces (teacher offerings management,
> student subscription setup/cancel + single-invoice generation) turned
> out to already exist undocumented in `TeacherManager`/`StudentManager`;
> the actual gap was invoice **review** — added `SubscriptionInvoicesQueue`
> (a `PaymentsQueue`-shaped confirm/reject view) plus a bulk "generate
> this month's invoices" action, on a new `admin/subscription-invoices`
> page/nav entry, entirely on top of already-existing routes/services.
> See `phase-29-teacher-subscriptions.md`'s TASK-2908 note for the full
> detail. Phase 29 stays `In Progress`: TASK-2909 (teacher/student-facing
> invoice views) remains `Not Started` and is next — its only
> dependency, TASK-2906, is already `Done`.

> TASK-2909 (teacher/student-facing invoice views) is now `Done`:
> `SubscriptionInvoicesPanel` mounted on `teacher/dashboard` (a
> `PaymentsQueue`-shaped confirm/reject queue, reusing TASK-2908's
> existing Admin review route since it already authorizes by session
> role/ownership, not URL prefix) and a read-only counterpart mounted on
> `student/dashboard`. See `phase-29-teacher-subscriptions.md`'s
> TASK-2909 note for the full detail. Phase 29 stays `In Progress`:
> TASK-2910 (`docs/features/subscriptions.md`) is the only task left in
> the phase and is next — its dependencies (TASK-2901–2906) are all
> already `Done`.

> Phase 29 moved to "Done": TASK-2910 (`docs/features/subscriptions.md`)
> landed — a dedicated feature doc matching `payments.md`/`enrollment.md`'s
> depth, covering `teacherOfferings`/`subscriptions`/`subscriptionInvoices`
> end to end (purpose, user stories, data, authorization, UI, edge cases)
> and added to `docs/features/README.md`'s index. All nine of this
> phase's tasks (TASK-2901–2910) are now `Done`.

> Phases 30–36 are a third post-MVP feature batch (user request, this
> session), organized from a single free-form list of requested
> improvements into per-area task files the same way batches one
> (20–24) and two (25–28) were. Grouped by area rather than by
> request order: Phase 30 (notifications UX/coverage), Phase 31
> (teacher profile + preview tooling), Phase 32 (student profile/My
> Courses/teachers directory rework), Phase 33 (admin overview/
> analytics/reporting), Phase 34 (admin manual cash payments +
> subscription oversight lists), Phase 35 (consolidated table action
> menus — pure UI consistency), Phase 36 (caching/performance — kept
> open-ended pending a real audit, TASK-3601, since the user's request
> didn't name specific slow paths). All tasks are `Not Started`; this
> commit is documentation-only — no implementation yet. Cross-phase
> dependencies are called out explicitly in each task (e.g. Phase 32's
> TASK-3204 depends on Phase 31's TASK-3105; Phase 34's TASK-3405
> depends on Phase 30's TASK-3003), so implementation order isn't
> strictly 30→36 — see each task's `Dependencies` line. One schema
> ambiguity was flagged rather than silently decided: TASK-3201 (student
> age) defaults to storing `birthDate` and computing age server-side
> instead of a raw `age` number, open for reconsideration.

> TASK-3002 (Clickable notifications with deep links) is now `Done` —
> `notifications` docs gain an optional `link` field, populated at
> creation time for both `meeting_link` (routes to the student's page for
> that teacher) and `class_reminder` (routes to the teacher's dashboard);
> the bell/banner rows are now clickable (mark-read + navigate) alongside
> their existing Join/Dismiss actions. See `phase-30-notifications-ux.md`'s
> TASK-3002 note for the full detail, including why the doc update landed
> in `docs/features/schedule.md` rather than a nonexistent
> `notifications.md`. TASK-3003 (generic audit notifications) is next in
> Phase 30 — its dependencies (TASK-2001–2003, TASK-3002) are now Done.

> TASK-3003 (Generic audit notifications) is now `Done` — `notifications`
> gains a fourth `type: "audit"` variant plus a centralized
> `auditNotificationService.notify()` write path, wired into
> `courseService`/`lessonService` (create/update/delete),
> `enrollmentService.createEnrollment`, and `paymentService`
> (create/confirm/reject/succeed), with a new role-agnostic
> `AuditNotificationsPanel` (`GET`/`PATCH /api/notifications/mine[/...]`)
> mounted on all three dashboards. Deliberately not exhaustive — exams,
> subscriptions, user accounts, and course publish/unpublish are left
> open; see `phase-30-notifications-ux.md`'s TASK-3003 note and the new
> `docs/features/notifications.md` for the full coverage table and
> reasoning. Verification suite could not run for real this session (no
> network in this sandbox) — reviewed by hand instead. TASK-3005 is next
> in Phase 30 (TASK-3004 remains blocked on Phase 33's TASK-3306).

> TASK-3005 (class-reminder acknowledge/expiry) is now `Done` — a teacher
> can "Dismiss" (acknowledge) a `class_reminder`, and any reminder past its
> class's start time (`createdAt + REMINDER_MINUTES_BEFORE` minutes,
> filtered at read time — no sweep job needed) stops showing as active.
> Fixed a pre-existing bug as a side effect: "Dismiss" previously only
> flipped `read` client-side, so a dismissed reminder silently reappeared
> on the next poll. See `phase-30-notifications-ux.md`'s TASK-3005 note.
> Phase 30 is now fully `Done` except TASK-3004, still blocked on Phase
> 33's TASK-3306 (`Not Started`).

> Phase 31 moved to "In Progress": TASK-3101 (extend `teacherProfiles`
> schema — bio, headline, yearsOfExperience, specialization, socialLinks,
> avatarUrl) is now `Done`. See `phase-31-teacher-profile-and-preview.md`'s
> TASK-3101 note for the full detail, including the `bio` string-to-map
> migration and a flagged (not fixed, out of scope) `publicRepository.ts`
> read-side gap. TASK-3102 (teacher-facing edit-my-profile page) is next —
> its only dependency, this task, is now `Done`.

> TASK-3102 (teacher-facing "edit my profile" page) is now `Done`:
> `teacherProfileService` (self-service `getMyProfile`/`updateMyProfile`,
> session's own `uid` is always the doc id) on top of TASK-3101's
> `updateDetails`, `GET`/`PATCH /api/teacher/profile`, and a new
> `/teacher/profile` page + `TeacherProfileForm` — bilingual `en`/`ar`
> inputs for `bio`/`headline`, avatar upload reusing the existing
> `target: "avatar"` signed-upload flow (same Cloudinary folder as the
> account picture on `/teacher/settings`, separate Firestore field), and
> a server-computed `completeness` percentage as a soft, non-blocking
> nudge. New `docs/features/teacher-profile.md`, added to
> `docs/features/README.md`'s index. See
> `phase-31-teacher-profile-and-preview.md`'s TASK-3102 note for the full
> detail, including why no component-level test was added (no jsdom/
> testing-library setup anywhere in this repo) and the re-flagged
> `publicRepository.ts` bio gap (deferred again, to TASK-3203).
> Verification suite could not run for real this session (no network in
> this sandbox, `node_modules` not installed) — reviewed by hand instead.
> TASK-3103 (nav bar profile icon) is next — its only dependency, this
> task, is now `Done`.

> TASK-3103 (nav bar profile icon routes to teacher's own profile) is now
> `Done`: `DashboardTopbar`'s profile-icon link now points a teacher
> session at `/teacher/profile` (TASK-3102) instead of `/teacher/settings`;
> admin/student sessions are unaffected (no equivalent profile page yet).
> See `phase-31-teacher-profile-and-preview.md`'s TASK-3103 note for the
> full detail. Phase 31 stays `In Progress`: TASK-3104 (course preview) is
> blocked on Phase 32's TASK-3202 (`Not Started`), so TASK-3105 (per-lesson
> free-preview flag) is next instead — it has no unmet dependency.

> TASK-3105 (per-lesson "free preview" flag) is now `Done`:
> `lessons.isFreePreview` (boolean, default `false`) added to the schema/
> repository, settable via the existing teacher lesson create/update flow
> (a new `Switch` toggle in `lesson-manager.tsx`'s dialog + a badge on
> flagged rows). The enrollment bypass landed in
> `lessonProgressService.reportProgress` (the actual student-facing
> access-check today — `lessonService` itself is teacher/Admin-only) and
> in `firestore.rules`'s `lessons/{lessonId}` read rule. See
> `phase-31-teacher-profile-and-preview.md`'s TASK-3105 note for the full
> detail, including why the bypass landed one layer down from where the
> task description pointed. Also fixed, unrelated to this task: four
> pre-existing test failures in `courseService`/`enrollmentService`/
> `paymentService`/`lessonService` (`FIREBASE_PROJECT_ID` env var missing)
> — each test file was missing a mock for `auditNotificationService`
> (added by TASK-3003, after those tests were last touched), so the real
> `notificationRepository` → `firebaseAdmin` chain loaded and threw;
> added the missing mock to all four. Neither change could be run for
> real this session (no network in this sandbox). Phase 31 stays
> `In Progress`: TASK-3104 remains blocked on Phase 32's TASK-3202;
> TASK-3106 (exam preview before publish) has no unmet dependency and is
> next.

> Follow-up to the TASK-3105 session note: the `auditNotificationService`
> mock fix surfaced two more pre-existing gaps, this time in the test
> data itself rather than a missing mock — `courseService.test.ts`'s
> "decrements course counters on delete" and `lessonService.test.ts`'s
> "deletes a lesson..." tests mocked `courseRepository.delete`/
> `lessonRepository.findById`'s resolved value without a `title` field,
> so `deleteCourse`/`deleteLesson`'s (pre-existing, TASK-3003) `.title.en`
> read for the audit notification's copy threw once the mock actually
> ran instead of being skipped. Fixed by adding a `title` to each mocked
> object. Run for real this time (user's machine, network available):
> 684/686 passing before this fix, 686/686 after — confirms both the
> `auditNotificationService` mock fix and this one.

> TASK-3106 (exam preview before publish) is now `Done`: owning
> teacher/Admin can preview a quiz — draft or published — exactly as a
> student attempting it would see it, via a new "Preview" button on
> `QuizManager`'s rows and the quiz detail page. Scoring reuses the
> exact same grading rule as a real attempt (extracted to
> `lib/server/quizGrading.ts`) but nothing is persisted — no
> `quizAttempts` document is ever created from a preview submission.
> See `phase-31-teacher-profile-and-preview.md`'s TASK-3106 note for
> the full detail. Phase 31 stays `In Progress`: TASK-3104 (course
> preview) remains the only task blocked, on Phase 32's TASK-3202
> (`Not Started`).

> TASK-3202 ("My Courses" — student's enrolled courses with
> continue/resume) is now `Done`: a new `student/courses` page lists
> only the caller's `active` enrollments (not `completed`/`cancelled`
> — those still show on `student/dashboard`'s full history), each with
> a progress bar and a Continue/Start action. The resume point is a
> new pure, unit-tested `enrollmentService.resolveResumeLessonId`
> (first not-yet-completed lesson in course order, last lesson if all
> done, `null` if the course has no lessons) — computed server-side by
> new `enrollmentService.listMyActiveCoursesWithProgress` alongside the
> course join, so the card links straight to
> `student/courses/[courseId]/lessons/[resumeLessonId]`. New lesson
> player page reuses the existing `LessonPlayer` (TASK-2502, unchanged)
> and gates its read via new `lessonService.getLessonForStudent` (same
> free-preview-or-enrollment rule as `lessonProgressService
> .reportProgress`); course/lesson-order for prev/next and a lesson
> sidebar come from new open (non-enrollment-gated) reads
> `courseService.getCourseForStudent`/`lessonService
> .listLessonsForStudent`. A new `MarkLessonCompleteButton` client
> component calls the existing `PATCH /api/enrollments/[enrollmentId]`
> (TASK-1102, unchanged) via a new `enrollmentService
> .getMyEnrollmentForCourse` read. Sidebar nav gained a "My courses"
> item for the new page; the old `dashboard` nav entry (notifications/
> invoices/full history) was relabeled "Dashboard" rather than removed,
> so it stays reachable. See `phase-32-student-experience.md`'s
> TASK-3202 note for the full detail, including the full verification
> run (719/719 tests, clean lint/translations/RTL/build). Phase 32
> stays `In Progress`: TASK-3201 (student profile) is next, and — a
> side effect worth flagging — Phase 31's TASK-3104 (course preview),
> which was blocked specifically on this task, is now unblocked too.

> TASK-3201 (Student profile — age, current stage, name, photo) is now
> `Done`: a new `student/profile` page (distinct from `student/settings`'s
> account page) lets a student edit `displayName`, an avatar, and a new
> `users.birthDate` field, with `stageId` (grade level) shown read-only.
> `birthDate` (ISO `YYYY-MM-DD`) was chosen over a raw `age` number
> specifically so the displayed age doesn't go stale — `age` is derived
> server-side from `birthDate` at read time (new
> `lib/validation/user.schema.ts`'s `computeAgeFromBirthDate`, reused by
> new `studentProfileService`) and never itself persisted. Avatar upload
> is not duplicated on a new endpoint — the form reuses TASK-1005's
> existing signed-upload flow and `PATCH /api/student/settings/avatar`;
> only `displayName`/`birthDate` go through the new `GET`/
> `PATCH /api/student/profile`. `stageId` is never accepted from the
> client on this route (Admin-only change, via Student management, to
> keep enrollment/subscription data consistent). Also extended
> `DashboardTopbar`'s TASK-3103 profile-icon routing so a student session
> now goes to `/student/profile` too. See
> `phase-32-student-experience.md`'s TASK-3201 note for the full detail,
> including the full verification run (111 files / 745 tests, up from
> 719, clean lint/translations/RTL/contrast/build). Phase 32 stays
> `In Progress`: TASK-3202 was already `Done`; TASK-3203 (rename "My
> Teachers" → "Teachers") is next — its dependencies (TASK-2301,
> TASK-2302, TASK-3101, Phase 29) are all satisfied.

> Phase 32 moved on: TASK-3203 (rename "My Teachers" → "Teachers") was
> already `Done` when this session started (the phase file had it
> marked `Done` with full detail; this table just hadn't been synced).
> This session completed **TASK-3204** (course detail view from a
> teacher's account page, access-gated content): a new
> `assertStudentHasCourseAccess` guard plus
> `courseService.hasActiveSubscriptionForCourse` unify "may this
> student play this course's lessons" into one rule — non-cancelled
> enrollment OR an active Phase 29 subscription covering the course's
> teacher+subject+stage — and `lessonService.getLessonForStudent` now
> checks both, not enrollment alone. New
> `lessonService.listLessonsForCourseDetail` returns a sanitized,
> `locked`-flagged lesson list (no `video`/`fileIds`) for the new
> `student/courses/[courseId]` page, linked from TASK-3203's teacher
> account course cards. See `phase-32-student-experience.md`'s
> TASK-3204 note for the full detail, including test coverage added
> to `courseService.test.ts`/`lessonService.test.ts`. Verification
> could not run for real this session (no network in this sandbox —
> `npm install` 403s, `node_modules` was never installed) — reviewed
> by hand instead, same constraint TASK-3203 hit; translation-key
> parity between `messages/en.json`/`ar.json` was checked manually and
> is clean. Phase 32 stays `In Progress`: TASK-3205 (student weekly
> schedule page) is next — its dependencies (Phase 6, Phase 29) are
> both satisfied.

> TASK-3104 (course preview before publish) is now `Done`, completing
> Phase 31: `courseService.getCourseForPreview` (owner/Admin-gated,
> status-agnostic) and `lessonService.listLessonsForCoursePreview`
> (locks every lesson except `isFreePreview`, ignoring the teacher's
> own access) back a new `teacher/courses/[courseId]/preview` page. It
> renders through a new shared `CourseDetailView` component, extracted
> from TASK-3204's student page with no markup changes, so preview and
> real student view render identically off the same data shape. A
> "Preview as a student" link was added to the course editor page. See
> `phase-31-teacher-profile-and-preview.md`'s TASK-3104 note for the
> full detail, including why verification was reviewed by hand (no
> network/`node_modules` in this sandbox, same constraint TASK-3203/
> TASK-3204 hit) and translation-key parity (1000/1000, checked
> manually). Phase 31 moves to `Done`. Next: Phase 30
> (Notifications UX & Delivery Coverage, `In Progress`), Phase 15/16/18
> (`In Progress`), Phase 11 (Enrollment, `In Progress`), or Phase 33-36
> (`Not Started`) — pick whichever unblocks what you want to ship next.

> TASK-3306 (Admin can open a course and view its content) is now
> `Done`, moving Phase 33 to `In Progress`: no new service code was
> needed — `courseService.getCourseForStudent` and
> `lessonService.listLessonsForCourseDetail` already accepted an
> `admin` session (added alongside TASK-3204) and already resolve
> every lesson unlocked for one, so the new `admin/courses/[courseId]`
> page just reuses those reads plus the shared `CourseDetailView`
> (TASK-3104) a third time. A "View" row action was added to the
> existing Admin course-overview table. See
> `phase-33-admin-insights.md`'s TASK-3306 note for the full detail,
> including the explicit scope note on per-lesson video/file/exam
> content being deferred. Verification reviewed by hand (no network in
> this sandbox). Phase 33 stays `In Progress`: TASK-3307 (Admin can
> open a teacher's/student's profile page) has no unmet dependency and
> is next; TASK-3301–3305 remain `Not Started` and form a separate
> chain (3304/3305 depend on 3302/3303).

> TASK-3307 (Admin can open a teacher's/student's account/profile page)
> is now `Done`: new `admin/teachers/[teacherId]` and `admin/students/
> [studentId]` pages give the Admin a read-only view of everything a
> teacher/student sees about themselves — profile, courses/offerings for
> a teacher; enrollments/subscriptions/payment history for a student —
> built almost entirely from reads other tasks already made
> Admin-allowed. Two small new reads were added: `teacherProfileService
> .getProfileForAdmin` (returns `null` instead of throwing when a
> teacher has no profile doc yet, so the page still renders) and
> `paymentService.listForStudentAdmin`. A "View profile" row action was
> added to both `TeacherManager` and `StudentManager`. See
> `phase-33-admin-insights.md`'s TASK-3307 note for the full detail,
> including the deliberate edge case around a student with zero
> enrollments and the translation-parity check (1068/1068 keys match).
> Verification reviewed by hand (no network in this sandbox, same
> constraint recent sessions in this phase have hit). Phase 33 moves to
> `In Progress`: TASK-3301–3305 remain `Not Started` and form a separate
> chain (3304/3305 depend on 3302/3303) — pick whichever unblocks what
> you want to ship next.

> TASK-3301 (Overview page — actionable summary cards) is now `Done`:
> the Admin overview page gets two new mini-lists above the audit
> notifications panel — "recently joined students" and "recent
> payments" (merging `payments` and `subscriptionInvoices`, sorted by
> recency, capped at 5 each) — via a new `adminOverviewService
> .getRecentActivity`, built entirely from reads other tasks already
> made center-wide/Admin-allowed. Each row links to the relevant
> student's new TASK-3307 account page. No new API route: the overview
> page already calls its services directly, same as Phase 19's stats
> cards. See `phase-33-admin-insights.md`'s TASK-3301 note for the full
> detail, including why the linked-detail-page acceptance criteria's
> "TASK-3305/3306" pointer was treated as a stale reference to
> TASK-3306/3307. Verification reviewed by hand (no network in this
> sandbox, same constraint recent sessions in this phase have hit).
> Phase 33 stays `In Progress`: TASK-3302 (Analytics — monthly revenue
> breakdown) is next — its dependencies are all satisfied;
> TASK-3303/3304/3305 remain `Not Started` and form the rest of the
> analytics chain.

> TASK-3302 (Analytics — monthly revenue breakdown) is now `Done`:
> `analyticsRepository.monthlyRevenue` and `.totalConfirmedRevenue` now
> combine both payment models — confirmed `subscriptionInvoices`
> (unchanged, bucketed by their own `period`) plus one-off `payments` in
> a terminal successful status (`succeeded`/`confirmed`), bucketed by
> `createdAt` — instead of subscription invoices alone. No service/route/
> component changes needed; `AdminAnalyticsOverview`'s existing chart and
> total-revenue card pick this up automatically. See
> `phase-33-admin-insights.md`'s TASK-3302 note for the full detail,
> including the new `analyticsRepository.test.ts` (didn't exist before).
> Full verification ran for real this session: `npm install`,
> `npx vitest run` (114 files / 786 tests, all passing, up from 765),
> `npx eslint` clean on changed files, `npx tsc --noEmit` only the same
> pre-existing, unrelated failures noted in prior sessions. Phase 33
> stays `In Progress`: TASK-3303 (teacher/subject/stage breakdowns) is
> next — its dependencies (Phase 19, Phase 29) are satisfied.

> TASK-3303 (Analytics — teacher/subject/stage breakdowns) is now
> `Done`: three new `analyticsRepository` aggregations
> (`activeStudentCountsByTeacher`, `activeStudentCountsBySubject`,
> `activeStudentIds`) union active enrollments + active subscriptions
> per teacher/subject, and expose the raw active-student id set for a
> stage grouping the service layer joins via `userRepository`. Three new
> ranked-list cards render below `AdminAnalyticsOverview`'s existing
> charts. See `phase-33-admin-insights.md`'s TASK-3303 note for the full
> detail, including a pre-existing (not this task's) `next build`
> TypeScript failure in `teacher-account-view.tsx` flagged for later
> cleanup. Full verification ran for real this session: `npm install`,
> `npx vitest run` (114 files / 791 tests, all passing, up from 786),
> `npx eslint` clean on changed files, `check-translations` (1093 keys
> in sync), `check-rtl`/`check-contrast` clean. Phase 33 stays
> `In Progress`: TASK-3304 (universal date-range filter) is next — both
> its dependencies (TASK-3302, TASK-3303) are now `Done`.

> TASK-3401 (Admin "Payments" section — combined view) is now `Done`,
> moving Phase 34 to `In Progress`: `adminPaymentsOverviewService
> .listAll` merges course `payments` and subscription
> `subscriptionInvoices` into one recency-sorted, status-normalized list
> behind the existing `admin/payments` page/route (updated in place, no
> new page). See `phase-34-admin-manual-payments.md`'s TASK-3401 note for
> the full detail, including the full verification run (803/803 tests,
> clean lint). Phase 34 stays `In Progress`: TASK-3402 (manual cash
> subscription payment, one action) is next — no unmet dependency.

> TASK-3305 (Analytics — Excel export) is now `Done`, moving Phase 33 to
> `Done`: `analyticsExportService` reuses `analyticsService.getOverview`
> directly (same read the on-screen page's route calls) so the exported
> `.xlsx` can't drift from the filtered view, then writes six sheets —
> `Summary`, `Revenue`, `Subscription Growth`, `Teachers`, `Subjects`,
> `Stages` — via a new `GET /api/admin/analytics/export?granularity=`
> route (same file-download shape as Phase 28's exam export) and an
> "Export to Excel" link on `AdminAnalyticsOverview`. See
> `phase-33-admin-insights.md`'s TASK-3305 note for the full detail,
> including the full verification run (800/800 tests, clean lint,
> `next build` compiling with only the same pre-existing, unrelated
> `teacher-account-view.tsx` type mismatch noted in TASK-3303/3304).
> All seven of this phase's tasks (TASK-3301–3307) are now `Done`. Next:
> Phase 34 (Admin Manual Payments), Phase 35 (Table Action Menus), Phase
> 36 (Caching/Performance) — all `Not Started` — or Phase 11/15/16/18
> (`In Progress`); pick whichever unblocks what you want to ship next.

> TASK-3304 (Analytics — universal date-range filter) is now `Done`:
> `analyticsRepository.buildRange(granularity)` resolves one
> `{ since, until, bucketKeys }` window for `month` (daily buckets),
> `year` (monthly buckets), or `5year` (yearly buckets), threaded
> through `monthlyRevenue`, `monthlySubscriptionGrowth`, and all three
> TASK-3303 breakdowns so one filter drives every chart on the page —
> the headline `totalRevenue`/`activeSubscriptions` figures stay
> all-time, unaffected by the filter. `GET /api/admin/analytics
> ?granularity=` (new `analytics.schema.ts`) defaults to `year`; the UI
> gained a three-way toggle. See `phase-33-admin-insights.md`'s
> TASK-3304 note for full detail. Full verification ran for real this
> session: `npm install`, `npx vitest run` (114 files / 797 tests, up
> from 791), `npx eslint` clean on changed files, `npx tsc --noEmit`/
> `npx next build` show only the same pre-existing, unrelated
> `teacher-account-view.tsx` failure noted in TASK-3303, `check-
> translations` (1097 keys in sync). Phase 33 stays `In Progress`:
> TASK-3305 (Excel export) is next — its dependencies (3302, 3303,
> 3304) are all now `Done`.

> TASK-3402 (Admin records a manual cash subscription payment — one
> action: pay + invoice + subscribe) is now `Done`: new
> `manualSubscriptionPaymentService.recordCashPayment` wraps the
> existing-subscription-or-create + confirmed-invoice-for-period write in
> one `adminDb.runTransaction` (all reads before any writes), exposed via
> `POST /api/admin/payments/manual-subscription`; `StudentManager`'s
> Subscriptions dialog gets a "Record cash payment" button next to both
> the new-subscription picker and each existing subscription row. See
> `phase-34-admin-manual-payments.md`'s TASK-3402 note for the full
> detail, including why the transaction lives in a new service rather
> than composing the existing `subscriptionService`/
> `subscriptionInvoiceService` calls, and why verification was reviewed
> by hand this session (no network available to run `npm install`/
> `npx vitest`).
>
> TASK-3403 ("Students with no active teacher subscription" list) is now
> `Done`: `subscriptionRepository.listActiveStudentIds()` returns a `Set`
> of every studentId with an `active` subscription; new
> `adminUnsubscribedStudentsService.list` negates that set against every
> `role: "student"` user, exposed via `GET /api/admin/students/
> unsubscribed`. Deliberately checks `subscriptions` only, not course
> `enrollments` — this list is about the teacher-subscription
> relationship specifically, a separate concern per
> `subscriptionRepository`'s own doc comment. Rendered by new
> `UnsubscribedStudentsList` on the Admin Payments page, alongside the
> existing payments table; each row links to that student's TASK-3307
> profile page, where the Admin can start TASK-3402's manual-subscribe
> flow. See `phase-34-admin-manual-payments.md`'s TASK-3403 note for full
> detail. Verified this session: `npx vitest run` (819/820 — the one
> failure is `manualSubscriptionPaymentService.test.ts`, pre-existing
> and unrelated, confirmed failing standalone too), ESLint clean on all
> changed files, `tsc --noEmit` shows only the same pre-existing
> unrelated errors, and `check-translations`/`check-rtl-ltr` both pass.
>
> Phase 34 stays `In Progress`: TASK-3404 ("Subscriptions due for
> renewal" list) is next.

> TASK-3404 ("Subscriptions due for renewal" list) is now `Done`:
> `subscriptionInvoiceRepository.listConfirmedSubscriptionIdsForPeriod`
> returns a `Set<subscriptionId>` of confirmed invoices for a period;
> new `adminSubscriptionsDueForRenewalService.list` negates that against
> every active subscription, additionally excluding subscriptions
> created within the current period (a brand-new subscription needs a
> first invoice, not a renewal). Exposed via `GET /api/admin/
> subscriptions/due-for-renewal`, rendered by new `DueForRenewalList` on
> the Admin Payments page, below TASK-3403's list; each row links to
> that student's TASK-3307 profile page → TASK-3402's manual-subscribe
> flow. See `phase-34-admin-manual-payments.md`'s TASK-3404 note for
> full detail. Verified: `npx vitest run` (821/822 — the one pre-existing
> unrelated failure noted above), ESLint clean, `tsc --noEmit` unchanged,
> `check-translations`/`check-rtl-ltr` both pass.
>
> **Phase 34 is now `In Progress`** — TASK-3401 through TASK-3404 are
> complete; TASK-3405 (student notifications for payment confirmed and
> renewal due) is the only remaining task in this phase.

> TASK-3501 (Shared `TableActionsMenu` component) is now `Done`, moving
> Phase 35 to `In Progress`: `components/ui/table-actions-menu.tsx` — one
> kebab trigger per row opening a config-driven action dropdown (icon,
> disabled, destructive-variant support), fully keyboard-navigable. See
> `phase-35-table-action-menus.md`'s TASK-3501 note for the full detail,
> including why keyboard-nav logic was factored into a pure
> `nextActiveIndex()` function with its own unit tests (no jsdom in this
> repo, so the component itself isn't render-tested).
>
> TASK-3502 (migrate every existing table to it) is now `Done` too —
> **Phase 35 is complete**. Six `Table` `rowActions` sites with a genuine
> multi-button column were migrated: `admin/teacher-manager.tsx`,
> `admin/student-manager.tsx`, `admin/center-config-manager.tsx` (both
> its stage and subject tables), `admin/subscription-invoices-queue.tsx`,
> and `teacher/course-manager.tsx` (its `Switch` publish-toggle stayed
> outside the menu — a persistent status control, not a discrete
> action). Six other `rowActions` sites already had only one button or
> none at all and were left unchanged, as out of this task's scope. See
> `phase-35-table-action-menus.md`'s TASK-3502 note for the full file
> list and reasoning. Verification reviewed by hand this session (no
> `node_modules`/network in this sandbox). Next: Phase 11/15/16/18
> (`In Progress`) or Phase 36 (`Not Started`) — pick whichever unblocks
> what you want to ship next.

> **Table corrections, this session:** Phase 34 was marked
> `In Progress` here but all five of its tasks (TASK-3401–3405) were
> already `Done` in `phase-34-admin-manual-payments.md` — stale row,
> now fixed.
>
> TASK-3004 (Admin notified when a teacher publishes a course) is now
> `Done`, closing **Phase 30**: `courseService.publishCourse` fans out a
> `new_course` notification to every Admin on the draft→published
> transition only, linking to TASK-3306's `/admin/courses/{id}` page.
> See `phase-30-notifications-ux.md`'s TASK-3004 note for the full
> detail. Next: Phase 11/15/16/18 (`In Progress`) or Phase 36
> (`Not Started`) — pick whichever unblocks what you want to ship next.

> TASK-3405 (student notifications for payment confirmed and renewal
> due) is now `Done` — **Phase 34 is complete.** Two independent pieces:
> (a) `subscriptionInvoiceService.confirmInvoice` and TASK-3402's
> `manualSubscriptionPaymentService.recordCashPayment` both now call
> `auditNotificationService.notify` to tell the student "Payment
> confirmed"; (b) a new daily sweep
> (`lib/server/jobs/subscriptionRenewalNotificationsJob.ts`, triggered
> by `app/api/cron/subscription-renewal-notifications/route.ts`, same
> `CRON_SECRET`-gated external-cron pattern as TASK-2001's
> `class-notifications`) notifies students whose subscription just
> became due for renewal, reusing TASK-3404's exact "who's due" query
> (factored out into shared `subscriptionRenewalQuery.ts` so the Admin
> list and this sweep never disagree) and guarding against repeat
> notifications via a new `lastRenewalNotifiedPeriod` field on
> `subscriptions/{id}`. Also fixed a genuine pre-existing test bug along
> the way: `manualSubscriptionPaymentService.test.ts`'s transaction
> mocks were missing Firestore's `.empty` field, which made one test
> fail every run — fixed and green now. See
> `phase-34-admin-manual-payments.md`'s TASK-3405 note for full detail.
> Verified: `npx vitest run` — **843/843 passing** (no more known
> failures anywhere in the suite), ESLint clean, `tsc --noEmit` shows
> only the same pre-existing unrelated errors from before this phase,
> `check-translations`/`check-rtl-ltr` both pass. Next up: Phase 35
> (Table Action Menus) or Phase 36, per the phase order above.
