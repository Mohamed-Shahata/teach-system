# Feature: Enrollment

## Purpose
Track which students are taking which paid courses, gated by payment,
and their progress.

## User stories
- As a student, I can start enrolling in a paid course by choosing a
  payment method (card/Fawry online, or Vodafone Cash/bank transfer
  manual) — see `features/payments.md`.
- As a student, once my payment is `succeeded`/`confirmed`, I'm
  automatically enrolled and can watch the course's lessons.
- As a student, I can see my progress (completed lessons / total).
- As a student, my progress reflects actual watch time on a lesson's
  video, not just whether I clicked "mark complete" — see
  `docs/tasks/phase-25-watch-progress-tracking.md`.
- As a teacher, I can create a student and enroll them directly in one
  of my own courses (bypassing the payment flow, e.g. they paid in
  person — this still creates a `payments` record with method
  `bank_transfer`/manual and `status: "confirmed"`, for a consistent
  audit trail).
- As a teacher, I can see per-lesson watch percentage for each student
  enrolled in one of my courses, not just their overall course
  progress — see "Teacher-facing per-lesson breakdown" below.

## Data
`enrollments/{enrollmentId}` — see `database/collections.md`. An
enrollment is only ever created by the server, as a side effect of a
`payments` document reaching `status: "succeeded"` (online) or
`"confirmed"` (manual/teacher-created) — never created directly from a
client request.

## Authorization
A student can only read their own enrollment/progress, and can only
update `progress` fields (never `status`, which is server-derived from
payment/completion logic). A teacher can read (not write) progress for
enrollments where `enrollment.teacherId == session.uid`.

## Progress calculation (TASK-2503, Phase 25)
`progress.percent` is the average, across every lesson in the course's
`lessonOrder`, of each lesson's score: **100%** if the lesson is in
`progress.completedLessonIds` (the manual "mark as completed" override,
unchanged from the original MVP behavior), otherwise that lesson's
watch percentage from `lessonProgress` (`watchedSeconds /
videoDurationSeconds`, capped at 100%, `0%` if never watched). See
`lib/server/services/enrollmentService.ts`'s `computeProgress`.

Recomputed in two places: `markLessonComplete` (adds a lesson to
`completedLessonIds`, then recomputes), and
`recalculateWatchProgress` (keeps `completedLessonIds` as-is, rerolls
just from current watch data — called by `lessonProgressService
.reportProgress` after every throttled watch-time report from the
lesson player, so `progress.percent` stays live without the student
needing to explicitly mark anything complete).

## Teacher-facing per-lesson breakdown (TASK-2504, Phase 25)
`enrollment.progress.percent` collapses a course down to one number,
which hides *how* a student got there — a student who watched every
video and one who only clicked "mark complete" on each lesson can end
up at the same percentage. `studentService.getCourseStudentsProgress`
(teacher-only, ownership-checked the same way as `courseService
.getCourse`) surfaces the same per-lesson rule `computeProgress`
already averages together (via the exported `enrollmentService
.watchPercent` helper), but per lesson instead of collapsed: for each
enrolled student, each lesson in the course gets its own `completed`
flag and `watchPercent`. Exposed via `GET
/api/courses/[courseId]/students` and rendered by
`components/teacher/course-students-panel.tsx`, mounted on the course
detail page alongside `LessonManager`/`QuizManager`.

## Student "My Courses" & lesson player (TASK-3202, Phase 32)
`student/courses` — a student-facing list of every course the student
has an **active** enrollment in (`completed`/`cancelled` enrollments
still show on `student/dashboard`'s full-history overview, but not
here — nothing left to "continue" there). Each card shows
`progress.percent` and a "Continue"/"Start" action.

The resume point (`enrollmentService.resolveResumeLessonId`, exported
and unit-tested on its own) is the first lesson in the course's
`lessonOrder` not in `progress.completedLessonIds`, or the last lesson
if every lesson is already complete, or nothing if the course has no
lessons yet — computed server-side by
`enrollmentService.listMyActiveCoursesWithProgress` so the card can
link straight to `student/courses/[courseId]/lessons/[lessonId]`
without a second round trip.

The lesson player itself (`student/courses/[courseId]/lessons/[lessonId]`)
reuses `components/student/lesson-player.tsx` (`LessonPlayer`,
TASK-2502 — already wired for watch-progress reporting) — this task's
new piece is the page around it: `lessonService.getLessonForStudent`
gates the read exactly like `lessonProgressService.reportProgress`
does (a `isFreePreview` lesson is open to any authenticated student;
everything else requires a non-cancelled enrollment), prev/next
lesson links and a lesson-list sidebar come from
`lessonService.listLessonsForStudent` +
`courseService.getCourseForStudent` (both open reads, not
enrollment-gated — see their doc comments; only lesson *content* is
gated, at `getLessonForStudent` itself), and a "mark complete" button
(`components/student/mark-lesson-complete-button.tsx`) calls the
existing `PATCH /api/enrollments/[enrollmentId]` (TASK-1102,
unchanged) via a new `enrollmentService.getMyEnrollmentForCourse` read
that resolves the caller's `enrollmentId` for the button.

## Course detail view from a teacher's account page (TASK-3204, Phase 32)
`student/courses/[courseId]` — reached by clicking a course card on a
teacher's account view (TASK-3203). Open to any authenticated student,
enrolled or not: shows the course's title/description/price and its
lesson list (`lessonService.listLessonsForCourseDetail`), each lesson
flagged `locked` — `false` for a free-preview lesson, or for any
lesson when the student has a non-cancelled enrollment in this course
or an **active Phase 29 subscription** covering the course's
teacher+subject+stage; `true` otherwise. This sanitized list carries
only `id`/`title`/`order`/`isFreePreview`/`locked` — never `video`/
`fileIds` — so a locked lesson's playable content is never present in
the response at all, not merely hidden in the UI. A locked lesson
renders without a link; an unlocked one links to the existing
`student/courses/[courseId]/lessons/[lessonId]` player, whose own
`lessonService.getLessonForStudent` read (via the new
`assertStudentHasCourseAccess` guard) is the actual server-side
enforcement — the same enrollment-or-subscription-or-free-preview rule,
checked again independently of what this page showed, so a direct
request for a gated lesson's content is rejected even if the client
never rendered this page first.
