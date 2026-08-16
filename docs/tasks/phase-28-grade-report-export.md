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
- Status: Not Started

## TASK-2802: PDF report generation
- Description: Server-rendered PDF (reuse whatever PDF library is already a project dependency, or a minimal one) with exam title, date, per-student score table, and summary stats (average, highest, lowest, pass rate against a configurable pass mark).
- Dependencies: TASK-2801
- Affected modules: `lib/server/services/examReportService.ts`
- Status: Not Started

## TASK-2803: Excel export
- Description: `.xlsx` generation of the same data as TASK-2802, one row per student, for teachers who want to further sort/filter/import into their own gradebook.
- Dependencies: TASK-2801
- Affected modules: `lib/server/services/examReportService.ts`
- Status: Not Started

## TASK-2804: Export button in exam results UI
- Description: "Export" dropdown (PDF / Excel) on the teacher's exam-results screen, calling TASK-2801 and triggering a file download.
- Dependencies: TASK-2802, TASK-2803
- Affected modules: `components/teacher/exam-results-panel.tsx`
- Status: Not Started
