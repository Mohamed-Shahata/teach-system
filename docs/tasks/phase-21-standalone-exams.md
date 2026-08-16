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
- Status: Done

> `createQuizSchema` now makes `courseId` optional with two `refine`s
> requiring `stageId`/`scheduledAt` when it's absent (mirrors
> `createAccountSchema`'s role-driven `refine`, `account.schema.ts`);
> added an optional `teacherId` field for the Admin-creates-standalone-
> exam case. `updateQuizSchema` gained `stageId`/`scheduledAt` too, so
> a standalone exam's stage/schedule can be edited after creation.
> `quizRepository.QuizDoc.courseId` is now optional, with `stageId`/
> `scheduledAt` added; `UpdateQuizDoc` extended to match.
> `quizService.createQuiz` branches: course-attached mode is unchanged
> (`teacherId` from the course); standalone mode resolves ownership via
> `resolveOwnerTeacherId(session, input.teacherId)` (`base.ts`, already
> existed, unused until now) and validates `stageId` against
> `educationStageRepository` (new `assertStageExists` helper, same
> pattern as `courseService.assertSubjectAndStageExist`).
> `quizService.updateQuiz` validates `stageId` the same way when
> present in the patch.
>
> **Scope boundary, on purpose:** this task only lands the data model +
> create/update. `quizService.getQuiz`'s student path
> (`loadQuizForStudent`) and `quizAttemptService.submitAttempt` both
> now explicitly `throw NotFoundError()` when `quiz.courseId` is
> absent, rather than trying to guess at TASK-2104's stage-gated
> enrollment-check replacement — that's TASK-2104's job, not this
> one's. Without this guard both would have thrown on
> `quiz.courseId` being possibly-`undefined` at the type level;
> instead they now fail closed with an explicit, documented reason.
> No dedicated test file existed for `quiz.schema.ts`; `quizService.test.ts`/
> `quizAttemptService.test.ts` weren't updated — flagging for review,
> since this sandbox has no `node_modules`/network to run them (same
> limitation as TASK-601/402/603 etc.).

## TASK-2102: Auto-grade vs manual-grade toggle
- Description: New `quiz.autoGrade: boolean` (default `true`). When `false`, `quizAttemptService.submitAttempt` still computes and stores the raw answers but does **not** compute/reveal a score immediately — the attempt is created with `status: "pending_review"` instead of `"graded"`, and the student-facing result view shows "submitted, awaiting grading" instead of a percentage.
- Dependencies: TASK-1202, TASK-2101
- Affected modules: `lib/validation/quiz.schema.ts`, `lib/server/services/quizAttemptService.ts`, `database/collections.md` (`quizAttempts.status`)
- Status: Done

> `quizzes.autoGrade: boolean` added (`createQuizSchema`/`updateQuizSchema`,
> `quizRepository.QuizDoc`/`CreateQuizDoc`/`UpdateQuizDoc`), defaulting to
> `true` both at creation (`quizService.createQuiz`, `input.autoGrade ??
> true`) and when reading pre-existing docs written before this field
> existed (`toQuizDoc`'s `data.autoGrade === undefined ? true : ...`).
> `quizAttempts` gained `status: "graded" | "pending_review"` (+ optional
> `gradedBy`/`gradedAt`, landed now since TASK-2103 needs them next and
> the doc shape only wants to change once) in `quizAttemptRepository`,
> with the same "absent means graded" backward-compat default for
> existing attempt docs. Also added `quizAttemptRepository.update` (not
> called yet — that's TASK-2103's grading endpoint).
> `quizAttemptService.submitAttempt` now branches on `quiz.autoGrade`:
> `true` keeps the existing immediate `computeScore` behavior
> (`status: "graded"`); `false` still stores the raw `answers` but skips
> scoring (`score: 0` placeholder, `status: "pending_review"`) — the
> description's "computes and stores the raw answers but does not
> compute/reveal a score immediately" is met by *not calling*
> `computeScore` at all here, rather than computing and hiding it, so a
> manually-graded attempt's `score` is never even transiently a real
> number.
> The student-facing "submitted, awaiting grading" *view* (as opposed to
> the data supporting it) isn't built here — no results/quiz-taking UI
> was touched, since none of that UI exists yet outside test fixtures in
> this codebase; revisit when the results screen is actually built.
> Added a `quizAttemptService.test.ts` case
> (`stores a manually-graded quiz's attempt as pending_review, unscored`)
> plus `autoGrade: true` on both test files' shared `quiz` fixture so the
> existing auto-grade assertions keep exercising the (now explicit)
> `true` path. Could not run the suite — no `node_modules`/network in
> this sandbox (same limitation as TASK-601/402/603/2101 etc.); `node
> --check` confirms no syntax errors in the touched files.

## TASK-2103: Teacher manual grading UI
- Description: For `autoGrade: false` quizzes, a grading screen listing `pending_review` attempts for a quiz, letting the teacher open one, see the student's submitted answers per question, and set a final score (0–100) — flips `status` to `"graded"` and stores `gradedBy`/`gradedAt`.
- Dependencies: TASK-2102
- Affected modules: `app/api/quizzes/[quizId]/attempts/[attemptId]/grade/route.ts`, `components/teacher/quiz-grading.tsx` (new), `app/[locale]/(protected)/teacher/quizzes/[quizId]/page.tsx`
- Status: Done

> New `quizAttemptService.gradeAttempt(session, attemptId, score)`:
> `teacher`/`admin` only, re-derives the quiz from the attempt's own
> `quizId` (never trusts the route's `quizId` param) and checks
> ownership via `assertTeacherOwnsResource`, same layering as
> `listAttemptsForQuiz`. Rejects (`ValidationError`) grading an attempt
> that isn't `pending_review` — covers both "already graded" and
> "this quiz is auto-graded" (which never produces a `pending_review`
> attempt) without needing a separate check. On success, flips
> `status` to `"graded"` and stamps `gradedBy`/`gradedAt` via the
> already-existing `quizAttemptRepository.update` (added, unused,
> back in TASK-2102).
> New route `PATCH /api/quizzes/[quizId]/attempts/[attemptId]/grade`
> — thin wrapper, `gradeQuizAttemptSchema` (new, `score: 0-100 int`)
> validates the body.
> `GET /api/quizzes/[quizId]/attempts` now branches by role instead of
> always calling `listMyAttempts`: a teacher/Admin gets
> `listAttemptsForQuiz` (every attempt, ownership-checked there) — this
> is the "grading queue" listing the task asked for; no new list route
> was needed since the existing one already had the right shape once
> it stopped assuming every caller is a student (comment left on
> TASK-1204 said this was deliberately deferred, not that it needed a
> new endpoint).
> New `components/teacher/quiz-grading.tsx` (`QuizGrading`, client
> component): lists `pending_review` attempts, opens a dialog per
> attempt showing the student's selected options against each
> question's `correctOptionIds` (correct answers highlighted, not
> revealed as a raw score) with a 0-100 score field; already-graded
> attempts show underneath as a read-only list. Wired into
> `teacher/quizzes/[quizId]/page.tsx` below `QuestionManager`, gated on
> `quiz.autoGrade === false` — an auto-graded quiz never shows the
> grading section and the page skips fetching attempts for it
> entirely.
> Added `messages/en.json`/`ar.json` under
> `teacherDashboard.quizzes.grading`.
> Extended `quizAttemptService.test.ts` (`gradeAttempt` cases:
> success, Admin override, non-owning teacher, student, already-graded,
> missing attempt) and `attempts/route.test.ts` (role branch); added
> `attempts/[attemptId]/grade/route.test.ts`. Could not run the suite —
> no `node_modules`/network in this sandbox (same limitation as every
> prior task here); did a bracket-balance pass over every touched file
> instead of `node --check`, since these are `.ts`/`.tsx`.

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
