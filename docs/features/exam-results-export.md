# Feature: Exam Results Export (PDF / Excel)

## Purpose
Let a teacher export an exam's results — whether the exam is
course-scoped or one of Phase 21's stage-wide standalone exams (see
`features/quizzes.md`) — as a PDF (printable report) or Excel
(`.xlsx`) file instead of only viewing them on-screen. See
`docs/tasks/phase-28-grade-report-export.md`.

## User stories
- As a teacher, from an exam's results screen, I can export a PDF or
  Excel report of every student's score, sorted highest-to-lowest.
- As a teacher, the report includes summary stats (average, highest,
  lowest score, and pass rate against a fixed pass mark) so I don't
  have to compute them myself.

## Data
No new collection — this reads existing `quizAttempts` (see
`database/collections.md`) plus the attempting students' names, joined
and sorted server-side. `examReportService.getReportData` assembles
one shared `ExamReportData` shape (rows + summary stats) that both
export formats *and* the on-screen results table consume, so the
numbers a teacher sees on screen and in a download can never disagree.

## Flow
`GET /api/exams/{examId}/export?format=pdf|xlsx` — the route does only
`?format=` validation and turns `examReportService`'s returned buffer
into a binary download response (`Content-Disposition: attachment`);
the ownership check and the actual data assembly live in the service.
- PDF: rendered with `pdfkit` — title, generated-at date, the summary
  stats line, and a paginated per-student score table.
- Excel: rendered with `exceljs` — the same title/date/summary header
  rows, then one row per student (name, score, status, submitted-at
  ISO timestamp), suited to a teacher who wants to further sort/filter
  or import into their own gradebook.

The teacher-facing `ExamResultsPanel` (mounted on the same
`teacher/quizzes/[quizId]` page as `QuizGrading`, TASK-2103) shows the
same rows/stats on screen and offers an "Export" dropdown (PDF /
Excel) that calls the export endpoint and triggers a browser download,
reading the filename off the response's `Content-Disposition` header.

## Authorization
Teacher-owns-this-exam only (`assertTeacherOwnsResource`, the same
ownership check used throughout `quizAttemptService`) — an Admin has
no standing shortcut here beyond the usual Admin-bypass pattern already
documented in `architecture/ownership-model.md`.

## Edge cases
- The pass mark used for "pass rate" is a fixed constant (`50`), not
  per-quiz configurable in this MVP — a future per-quiz pass-mark
  field would be a schema addition, not a rewrite of the report logic.
- Export is a synchronous request/response (no background job/queue) —
  fine at current exam-size volumes; revisit if a stage-wide exam's
  attempt count ever makes the PDF/Excel render slow enough to matter.
