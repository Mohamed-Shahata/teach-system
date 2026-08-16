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
| 6 | Ownership & Access Rules (Center: Admin + Teachers) | In Progress |
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
| 26 | Real Push Notifications (FCM / Web Push) | Not Started |
| 27 | Student Reviews & Ratings for Teachers | Not Started |
| 28 | Exam Results Export (PDF / Excel) | Not Started |
| 15 | Security | Not Started |
| 16 | Testing | Not Started |
| 17 | Deployment | Not Started |
| 18 | MVP Finalization | Not Started |

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

Before starting any task, follow `development/ai-agent-workflow.md`.
