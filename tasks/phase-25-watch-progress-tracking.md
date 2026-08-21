# Phase 25 — Lesson Watch-Progress Tracking

> Added post-MVP, suggested alongside Phases 20–24. Today
> `enrollment.progress` is derived from whether a lesson is marked
> "completed" as a whole (see `features/enrollment.md`), which is a
> coarse signal — a student who watched 10 seconds of a video and one
> who watched all of it both count the same. This phase adds real
> watch-time tracking per lesson video and folds it into a more
> accurate progress calculation, without changing the existing
> completed/not-completed flag (it still exists; this phase adds a
> second, finer-grained signal alongside it).

## TASK-2501: `lessonProgress` collection
- Description: New collection `lessonProgress/{studentId}_{lessonId}` storing `watchedSeconds`, `videoDurationSeconds`, `lastPositionSeconds`, `updatedAt`. Document ID composite key avoids a query index for the common "my progress on this lesson" lookup.
- Dependencies: TASK-901 (lessons), TASK-1101 (enrollment)
- Affected modules: `docs/database/collections.md`, `firestore.rules`, `firestore.indexes.json`
- Status: Done

> `lessonProgress/{studentId}_{lessonId}` documented in
> `collections.md` (`studentId`, `lessonId`, `watchedSeconds`,
> `videoDurationSeconds`, `lastPositionSeconds`, `updatedAt`). Rules
> added: a student may read/write only their own doc (id format and
> `studentId`/`lessonId` immutability enforced in the `create`/`update`
> conditions), Admin may read, no client delete. `firestore.indexes.json`
> left unchanged — the composite doc id serves the only query this task
> needs, per the collection's own note; TASK-2504 adds an index then if
> its teacher-side aggregate view turns out to need one.

## TASK-2502: Client-side progress reporting
- Description: The lesson video player (YouTube iframe API or native `<video>` for Cloudinary-hosted lessons) periodically reports `currentTime`/`duration` to a throttled `PATCH /api/lessons/{lessonId}/progress` endpoint (e.g. every 10s or on pause/unmount), writing to TASK-2501's collection for the current student.
- Dependencies: TASK-2501
- Affected modules: `components/student/lesson-player.tsx`, `app/api/lessons/[lessonId]/progress/route.ts`
- Status: Done

> Also added (implied infrastructure, not listed above since the task
> description only named the endpoint + player): `lib/validation
> /lessonProgress.schema.ts` (`reportLessonProgressSchema` —
> `currentTimeSeconds`/`durationSeconds`), `lib/server/repositories
> /lessonProgressRepository.ts` (`findByStudentAndLesson`/`upsert`, same
> composite-id pattern as TASK-2501's doc note), and
> `lib/server/services/lessonProgressService.ts` (`reportProgress` —
> student-only via `assertRole`, gated by `assertStudentEnrolled` same
> as `markLessonComplete`). `watchedSeconds` is server-derived as
> `max(existing, reported currentTime)` — furthest point reached, not a
> client-trusted cumulative total — cheap and hard to game without
> tracking played segments; documented as an intentional
> simplification in the service. `LessonPlayer` wraps `VideoPlayer`,
> reading the underlying `<video>` element's `timeupdate`/`pause`
> events (throttled to one report per 10s, plus one more on
> pause/unmount) — only wired for the native-`<video>` providers
> (`cloudinary`/`external`); a `youtube` lesson would need the YouTube
> IFrame Player API for `currentTime`/`duration`, left as a follow-up.
> No student-facing "watch this lesson" page exists yet to mount
> `LessonPlayer` on — out of scope here (not in this task's affected
> modules); TASK-2503/2504 or a later phase would add it. Unit tests
> added for the repository, service, and route (same
> not-run-against-a-real-Firestore caveat as other repository tests).

## TASK-2503: Roll watch-progress into `enrollment.progress`
- Description: Update the `enrollment.progress` calculation to weight lessons by watch percentage (`watchedSeconds / videoDurationSeconds`, capped at 100%) instead of a binary completed flag, while keeping "mark as completed" as an explicit override a student can still trigger manually.
- Dependencies: TASK-2502
- Affected modules: `lib/server/services/enrollmentService.ts`, `features/enrollment.md`
- Status: Done

> `computeProgress` (private helper in `enrollmentService.ts`) now
> averages, per lesson in `course.lessonOrder`: 100% if the lesson is
> in `completedLessonIds` (unchanged manual override), else that
> lesson's watch percentage from `lessonProgressRepository
> .listByStudentForLessons` (`watchedSeconds/videoDurationSeconds`,
> capped, `0` if never watched). `markLessonComplete` uses it as
> before (now `await`ed, since it does a repository read). New
> `enrollmentService.recalculateWatchProgress(studentId, courseId)`
> reuses the same helper without touching `completedLessonIds` — wired
> into `lessonProgressService.reportProgress` (TASK-2502) so
> `enrollment.progress` updates live from watch time, not only when a
> lesson is explicitly marked complete. Returns `null` (not a thrown
> error) when no enrollment exists for the pair, since the caller has
> already gated on `assertStudentEnrolled`. `docs/features/enrollment
> .md` gained a "Progress calculation" section documenting the
> weighting and the two recompute call sites. Existing and new unit
> tests (repository, service, route) all updated/added and passing.

## TASK-2504: Teacher-facing per-student progress view
- Description: On the course's student list (teacher side), show per-lesson watch percentage, not just overall course completion — helps a teacher spot who's actually watching vs. who clicked "complete".
- Dependencies: TASK-2503
- Affected modules: `components/teacher/course-students-panel.tsx`
- Status: Done

> Also added (implied infrastructure, not listed above since the task
> description only named the component): `studentService
> .getCourseStudentsProgress` (teacher-only, ownership-checked via
> `courseRepository.findById` + `assertWritableByTeacher` — same as
> `courseService.getCourse`, which the page this mounts on already
> calls), and `GET /api/courses/[courseId]/students`. Per enrolled
> student, reuses TASK-2503's exported `enrollmentService.watchPercent`
> helper (rather than re-deriving the same rule) to compute a per-lesson
> percentage: `100` when the lesson is in the student's
> `completedLessonIds` (the manual override), else the watch percentage
> from `lessonProgressRepository.listByStudentForLessons` (`0` if never
> watched) — the exact same per-lesson rule `enrollmentService
> .computeProgress` already averages into `enrollment.progress.percent`,
> just surfaced per-lesson instead of collapsed into one number. No new
> Firestore index needed: like TASK-2502/2503, this stays on the
> existing per-student `listByStudentForLessons` batch-get (one call per
> enrolled student, deterministic doc ids), not a new query shape, so
> the index question left open in TASK-2501's note didn't end up
> applying here. `CourseStudentsPanel` (mounted on
> `teacher/courses/[courseId]/page.tsx`, alongside `LessonManager`/
> `QuizManager`) lists each enrolled student's overall progress with a
> "view breakdown" action opening a dialog of per-lesson watch % +
> a "completed" badge where the manual override applies. Admin access
> was intentionally left out (would need a `teacherId` narrowing param
> like `studentService.listStudents`/`getStudentDetail`, added when an
> Admin-facing surface actually needs it). Unit tests added for the
> service method and the route.

All four of this phase's tasks (TASK-2501–2504) are now `Done`.
