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
