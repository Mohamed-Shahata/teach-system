# Feature: Quiz / Exam System

## Purpose
Let teachers assess students and let students take quizzes and see
results.

## User stories
- As a teacher, I can create a quiz with multiple-choice/true-false
  questions and publish it.
- As a student, I can take a published quiz for a course I'm enrolled in
  and see my score after submitting.

## Data
`quizzes`, `questions`, `quizAttempts` — see `database/collections.md`.

## Authorization & security
- `correctOptionIds` on `questions` is **never** sent to the student
  client before submission — the student-facing GET endpoint strips it.
- Score is computed server-side in `QuizService.submitAttempt`, comparing
  submitted `selectedOptionIds` against the server-held
  `correctOptionIds`; the client cannot submit a score directly.

## Extensibility
`question.type` is a string union (`"multiple_choice" | "true_false"`
in MVP) designed to grow to `short_answer | essay | matching` by adding
a new type + a new grading strategy, without rewriting the quiz-taking
flow.

## Standalone, stage-wide exams (Phase 21)
The MVP ties every quiz to a course. `docs/tasks/phase-21-standalone-
exams.md` adds a second mode: no `courseId`, targeted at an entire
`stageId` instead, opened at a scheduled time, with an optional
auto-grade/manual-grade toggle.

**TASK-2101 (Done):** `quizzes.courseId` is now optional at the schema
and service layer — `quizService.createQuiz`/`updateQuiz` branch on
whether `courseId` is present. A standalone quiz instead requires
`stageId` (validated against a real `educationStages` doc, same pattern
as `courseService.assertSubjectAndStageExist`) and `scheduledAt`. An
Admin creating a standalone exam must supply `teacherId` explicitly
(`resolveOwnerTeacherId`); a Teacher always owns their own.
Course-attached quizzes are unaffected — `teacherId` still comes from
the course.

Everything downstream of *reading/taking* a standalone quiz is
intentionally still gated as "not found": `quizService.getQuiz`
(student path) and `quizAttemptService.submitAttempt` both check
`quiz.courseId` and reject if it's absent, since the stage-targeted
read/list/take flow (skipping the course-enrollment check in favor of a
stage match) is TASK-2104, not this task. TASK-2102 (auto-grade
toggle), TASK-2103 (manual grading UI), TASK-2104 (student list/take),
and TASK-2105 (teacher management UI) remain Not Started.

**TASK-2102 (Done):** `quiz.autoGrade` (default `true`) controls whether
`quizAttemptService.submitAttempt` scores an attempt immediately.
`autoGrade: false` quizzes still store the student's raw `answers`, but
the attempt is written with `status: "pending_review"` and `score: 0`
(a placeholder, not a real result) instead of running `computeScore` —
a teacher grades it by hand instead (TASK-2103).

**Phase 21 is now fully `Done`** (all five tasks, TASK-2101–2105).
TASK-2103 added the teacher-facing manual grading UI
(`QuizGrading`, mounted alongside `QuizManager`) for `pending_review`
attempts. TASK-2104 added the stage-targeted read/list/take flow for
standalone exams (a student-facing list scoped by `stageId` instead of
course enrollment, plus the corresponding `getQuiz`/`submitAttempt`
branch that no longer rejects an absent `courseId`). TASK-2105 added
the teacher-facing management UI for creating/editing standalone
exams. See `docs/tasks/phase-21-standalone-exams.md` for the
per-task detail.

## Teacher preview (TASK-3106)

The owning teacher (or Admin) can preview any of their quizzes —
`draft` or `published`, course-attached or standalone — exactly as a
student attempting it would see it, before ever publishing it.

- **`GET /api/quizzes/[quizId]/preview`** (`quizService.getQuizPreview`)
  returns the quiz plus its questions in the same
  `correctOptionIds`-stripped `PublicQuestionDoc` shape a real student
  read returns (`toPublicQuestion`), but — unlike
  `listQuestionsForStudent` — works regardless of `status`, since the
  whole point is to preview a quiz *before* it's published. Ownership
  is checked the same way every other teacher/Admin quiz read is
  (`assertTeacherOwnsResource`).
- **`POST /api/quizzes/[quizId]/preview`** (`quizAttemptService.previewAttempt`)
  "submits" a preview run and scores it with the exact same rule a
  real attempt uses (`lib/server/quizGrading.ts`'s `computeScore`,
  shared by both paths so preview scoring can never drift from real
  scoring) — but it never calls `quizAttemptRepository.create`. No
  `quizAttempts` document is created, ever, from this route. The
  response is an ephemeral `{ quizId, answers, score, previewedAt }`
  object with no `id` — there is nothing a later request could look
  up.
- The client reuses the same quiz-taking component
  (`components/quiz/quiz-taker.tsx`) for both real and preview
  attempts via a `mode: "live" | "preview"` prop — identical rendering,
  question order, and option layout either way, just a different
  submit endpoint and no "previous attempts" history strip in preview
  mode (a preview run has none to show).
- The "Preview" action is available from `QuizManager`'s row actions
  (both course-attached and standalone-exam lists) and from the quiz
  detail page's header, so it's reachable everywhere a teacher already
  manages a quiz.
