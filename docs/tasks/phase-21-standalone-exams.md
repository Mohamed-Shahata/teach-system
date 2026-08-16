# Phase 21 — Stage-Wide Exams & Manual Grading

> Extends the Phase 12 quiz/exam system (`quizzes`/`questions`/
> `quizAttempts`, see `database/collections.md` and
> `features/quizzes.md`). Today every quiz belongs to exactly one
> `courseId` and is always auto-graded (exact-match scoring in
> `quizAttemptService.submitAttempt`). This phase adds a second kind of
> exam: **not** tied to a course, scheduled for a specific time, and
> targeted at an entire education stage (e.g. every student in "3
> ثانوي") rather than a course's enrolled students — plus an opt-out of
> auto-grading for exams a teacher wants to mark by hand.

## TASK-2101: Make `quiz.courseId` optional; add stage targeting + schedule
- Description: `quizzes.courseId` becomes optional. When absent, the quiz is a standalone exam and must instead carry `stageId` (required in that case — mirrors `createAccountSchema`'s course-vs-role `refine` pattern) and `scheduledAt` (timestamp, when the exam opens for students). `quizService.createQuiz`'s ownership/validation branches on which mode it's in.
- Dependencies: TASK-1201
- Affected modules: `lib/validation/quiz.schema.ts`, `lib/server/services/quizService.ts`, `database/collections.md` (`quizzes.stageId`, `quizzes.scheduledAt`, `courseId` now optional)
- Status: Not Started

## TASK-2102: Auto-grade vs manual-grade toggle
- Description: New `quiz.autoGrade: boolean` (default `true`). When `false`, `quizAttemptService.submitAttempt` still computes and stores the raw answers but does **not** compute/reveal a score immediately — the attempt is created with `status: "pending_review"` instead of `"graded"`, and the student-facing result view shows "submitted, awaiting grading" instead of a percentage.
- Dependencies: TASK-1202, TASK-2101
- Affected modules: `lib/validation/quiz.schema.ts`, `lib/server/services/quizAttemptService.ts`, `database/collections.md` (`quizAttempts.status`)
- Status: Not Started

## TASK-2103: Teacher manual grading UI
- Description: For `autoGrade: false` quizzes, a grading screen listing `pending_review` attempts for a quiz, letting the teacher open one, see the student's submitted answers per question, and set a final score (0–100) — flips `status` to `"graded"` and stores `gradedBy`/`gradedAt`.
- Dependencies: TASK-2102
- Affected modules: `app/api/quizzes/[quizId]/attempts/[attemptId]/grade/route.ts`, `components/teacher/quiz-grading.tsx` (new), `app/[locale]/(protected)/teacher/quizzes/[quizId]/page.tsx`
- Status: Not Started

## TASK-2104: Student-facing standalone exam list
- Description: A student needs somewhere to see exams that aren't attached to any course — "exams for my stage." New endpoint listing published, `scheduledAt <= now` quizzes where `quiz.stageId === session user's stageId` (and `courseId` is absent). Reuses `quizService.listQuestionsForStudent`/`QuizTaker` (TASK-1204) for the actual taking flow — a standalone exam still needs a `courseId`-free variant of the enrollment check in `quizAttemptService.submitAttempt` (skip `assertStudentEnrolled` when `quiz.courseId` is absent; gate on stage match instead).
- Dependencies: TASK-2101, TASK-1204
- Affected modules: `app/api/exams/route.ts` (new, student-facing list), `lib/server/services/quizService.ts`, `lib/server/services/quizAttemptService.ts`, `app/[locale]/(protected)/student/exams/page.tsx` (new)
- Status: Not Started

## TASK-2105: Teacher-facing standalone exam management
- Description: A dedicated screen (outside any course) for a teacher to create/edit/publish standalone exams — same builder as `QuizManager`/`QuestionManager` (TASK-1203) but entry point is `teacher/exams`, not a course detail page. The existing `teacher/exams/page.tsx` route already exists as a placeholder per `architecture/folder-structure.md` — this task fills it in.
- Dependencies: TASK-2101, TASK-1203
- Affected modules: `app/[locale]/(protected)/teacher/exams/page.tsx`, `components/teacher/quiz-manager.tsx` (branch for course-less mode)
- Status: Not Started
