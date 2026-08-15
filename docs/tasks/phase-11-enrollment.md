# Phase 11 — Enrollment

## TASK-1101: Enrollment repository & service
- Description: Enrollment is created server-side only as a side effect of a `payments` document reaching `succeeded`/`confirmed` (TASK-1104) — never created directly from a client request. Also covers progress tracking (`completedLessonIds`, recompute `percent`).
- Dependencies: TASK-801, TASK-1104
- Status: Not Started

## TASK-1102: Enrollment API routes
- Description: Progress update endpoint (marking a lesson complete) and read endpoints for a student's own enrollments. (Enrollment *creation* has no direct endpoint — it happens via the payments flow, TASK-1105/1106.)
- Dependencies: TASK-1101, TASK-501
- Status: Not Started

## TASK-1103: Student "my courses" & progress UI
- Dependencies: TASK-1102, TASK-204
- Status: Not Started

## TASK-1104: Payments repository & service
- Description: `payments` repository + service implementing the state machine (`pending → succeeded/confirmed/rejected`), per `features/payments.md`. Confirming a manual payment or receiving a `succeeded` webhook triggers `createEnrollment` (TASK-1101).
- Dependencies: TASK-602
- Status: Not Started

## TASK-1105: Online payment flow (card/Fawry)
- Description: `POST /api/courses/[courseId]/pay` creates a `pending` payment and starts a gateway checkout session; `POST /api/payments/webhook` verifies the gateway signature and flips the payment to `succeeded`. Gateway choice (e.g. Paymob) to be confirmed — see `features/payments.md`.
- Dependencies: TASK-1104
- Status: Not Started

## TASK-1106: Manual payment flow (Vodafone Cash / bank transfer)
- Description: Student submits a `pending` manual payment with a reference note; teacher/Admin confirm or reject it (surfaced in TASK-704's queue and an Admin-side equivalent).
- Dependencies: TASK-1104
- Status: Not Started
