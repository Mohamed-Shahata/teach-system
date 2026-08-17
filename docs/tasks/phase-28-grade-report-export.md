# Phase 28 — Exam Results Export (PDF / Excel)

> Added post-MVP, suggested alongside Phases 20–24. Once Phase 21
> (Stage-Wide Exams) ships, a teacher can have an exam with results
> spanning either a single course's enrolled students or an entire
> stage. This phase lets the teacher export those results as a
> PDF (printable report) or Excel (`.xlsx`) file instead of only
> viewing them on-screen.

## TASK-2801: Results export endpoint
- Description: `GET /api/exams/{examId}/export?format=pdf|xlsx` — server-side, teacher-owns-this-exam guarded. Pulls `quizAttempts` for the exam plus student names/`stageId`, sorted by score descending.
- Dependencies: TASK-1201 (quiz/exam), Phase 21's `stageId`-scoped exams
- Affected modules: `app/api/exams/[examId]/export/route.ts`
- Status: Done

> Implemented as a thin route over `examReportService.getReportData`
> (TASK-2802/2803's own service), which does the ownership check
> (`assertTeacherOwnsResource`, same pattern as `quizAttemptService`) and
> the `quizAttempts` → `users` join, sorted by score descending. The
> route's own job is just `?format=` validation and turning the returned
> buffer into a binary download response
> (`Content-Disposition: attachment`) rather than the usual JSON
> envelope — the only route in `app/api/*` that does this. Unit tests in
> `route.test.ts` mock `examReportService` entirely (same "mock the
> layer below, don't hit Firestore" convention as every other route
> test).

## TASK-2802: PDF report generation
- Description: Server-rendered PDF (reuse whatever PDF library is already a project dependency, or a minimal one) with exam title, date, per-student score table, and summary stats (average, highest, lowest, pass rate against a configurable pass mark).
- Dependencies: TASK-2801
- Affected modules: `lib/server/services/examReportService.ts`
- Status: Done

> No PDF library was already a dependency, so `pdfkit` was added
> (lightweight, no native/binary deps — safe for the deploy target).
> `examReportService.getReportData` assembles one shared
> `ExamReportData` shape (rows + summary stats: attempt count, average,
> highest, lowest, pass rate against a `PASS_MARK` of 50) that both
> `renderPdf` and `renderXlsx` consume, so the two export formats and
> the on-screen results panel (TASK-2804) can never disagree on numbers.
> `renderPdf` streams a title, generated-at date, the stats line, and a
> simple paginated table (`doc.addPage()` once a page fills) via
> `pdfkit`'s `PDFDocument`, returned as a `Buffer` collected from its
> `data`/`end` events.

## TASK-2803: Excel export
- Description: `.xlsx` generation of the same data as TASK-2802, one row per student, for teachers who want to further sort/filter/import into their own gradebook.
- Dependencies: TASK-2801
- Affected modules: `lib/server/services/examReportService.ts`
- Status: Done

> Added `exceljs` (no existing xlsx dependency in the project).
> `renderXlsx` writes the same title/date/summary header rows as the PDF
> version, then one row per student (name, score, status, submitted-at
> ISO timestamp) via `ExcelJS.Workbook`/`writeBuffer()`. Covered in
> `examReportService.test.ts` by asserting the returned buffer's
> `"PDF"`/`"PK"` magic bytes rather than parsing the binary formats
> in-test — matches the project's "test at the service boundary, don't
> re-implement the library's own test suite" convention.

## TASK-2804: Export button in exam results UI
- Description: "Export" dropdown (PDF / Excel) on the teacher's exam-results screen, calling TASK-2801 and triggering a file download.
- Dependencies: TASK-2802, TASK-2803
- Affected modules: `components/teacher/exam-results-panel.tsx`
- Status: Done

> There was no existing "exam-results screen" to attach to — this task
> created `ExamResultsPanel` and wired it into
> `teacher/quizzes/[quizId]/page.tsx` (the same page `QuizGrading`,
> TASK-2103, already renders on), rather than a new route, since a
> results table is a natural sibling of the grading queue on the same
> quiz/exam detail page. The panel takes the server-fetched
> `ExamReportData` (TASK-2801's `examReportService.getReportData`,
> called once per page load alongside the existing
> `quizService`/`quizAttemptService` calls) as a prop — same
> score-descending rows and summary stats the export downloads use — and
> renders them with the existing `Table`/`Badge`/`EmptyState` primitives.
> The "Export" control reuses `components/ui/dropdown-menu.tsx`
> (`DropdownMenu`) rather than introducing a new dropdown component,
> per the coding rules' "no duplicate functionality" rule; each item
> calls `GET /api/exams/{examId}/export?format=...`, turns the response
> into a `Blob`, and triggers a download via a synthetic `<a download>`
> click, reading the actual filename off the response's
> `Content-Disposition` header set by TASK-2801's route. New
> `teacherDashboard.quizzes.resultsPanel.*` keys added to both
> `messages/en.json` and `messages/ar.json` (`npm run check-translations`
> passes, 845 keys in sync).
