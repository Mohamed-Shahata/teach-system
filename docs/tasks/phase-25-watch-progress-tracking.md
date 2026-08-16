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
- Status: Not Started

## TASK-2502: Client-side progress reporting
- Description: The lesson video player (YouTube iframe API or native `<video>` for Cloudinary-hosted lessons) periodically reports `currentTime`/`duration` to a throttled `PATCH /api/lessons/{lessonId}/progress` endpoint (e.g. every 10s or on pause/unmount), writing to TASK-2501's collection for the current student.
- Dependencies: TASK-2501
- Affected modules: `components/student/lesson-player.tsx`, `app/api/lessons/[lessonId]/progress/route.ts`
- Status: Not Started

## TASK-2503: Roll watch-progress into `enrollment.progress`
- Description: Update the `enrollment.progress` calculation to weight lessons by watch percentage (`watchedSeconds / videoDurationSeconds`, capped at 100%) instead of a binary completed flag, while keeping "mark as completed" as an explicit override a student can still trigger manually.
- Dependencies: TASK-2502
- Affected modules: `lib/server/services/enrollmentService.ts`, `features/enrollment.md`
- Status: Not Started

## TASK-2504: Teacher-facing per-student progress view
- Description: On the course's student list (teacher side), show per-lesson watch percentage, not just overall course completion — helps a teacher spot who's actually watching vs. who clicked "complete".
- Dependencies: TASK-2503
- Affected modules: `components/teacher/course-students-panel.tsx`
- Status: Not Started
