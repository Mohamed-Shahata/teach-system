# Phase 11 — Enrollment

## TASK-1101: Enrollment repository & service
- Description: Enrollment is created server-side only as a side effect of a `payments` document reaching `succeeded`/`confirmed` (TASK-1104) — never created directly from a client request. Also covers progress tracking (`completedLessonIds`, recompute `percent`).
- Dependencies: TASK-801, TASK-1104
- Affected modules: `lib/validation/enrollment.schema.ts`, `lib/server/repositories/enrollmentRepository.ts`, `lib/server/services/enrollmentService.ts`, `lib/server/services/paymentService.ts`
- Status: Done

> Unblocked the moment TASK-1104 landed. `enrollmentRepository` keys
> each doc at a deterministic `${studentId}_${courseId}` id and creates
> via `.create()` (fails instead of overwriting) to actually enforce
> the `(studentId, courseId)` uniqueness collections.md calls for — same
> pattern `userRepository` uses for `users/{uid}`. `enrollmentService
> .createEnrollment` is idempotent (returns the existing enrollment, or
> recovers from a Firestore `ALREADY_EXISTS` race, instead of throwing)
> since it's called from a payment-webhook/manual-confirm path that
> could retry. Wired into both `TODO(TASK-1101)` spots left in
> `paymentService.ts` (`confirmManualPayment`, `markPaymentSucceeded`).
> `markLessonComplete` recomputes `progress.percent` from the course's
> `lessonOrder` length and flips `status` to `completed` at 100% — never
> lets a client set `status` directly, per `features/enrollment.md`.
> Unit tests added for both the repository and service (same
> not-run-here caveat as TASK-1104's — no network/emulator in this
> sandbox).

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
- Affected modules: `lib/validation/payment.schema.ts`, `lib/server/repositories/paymentRepository.ts`, `lib/server/services/paymentService.ts`
- Status: Done

> Implemented out of phase order — reached via TASK-1001, found
> blocked on this (see the note there), and this was the actual next
> unblocked task in dependency order (only dep is TASK-602, Done).
> `paymentRepository` covers create/read/list (by student, by teacher —
> the latter scoped via `scopeToTeacher`, TASK-602) and the two
> teacher/admin-facing status writes; `paymentService` layers the state
> machine on top: `createPayment` (student, priced from the course's own
> stored `price`/`currency` — never client input), `confirmManualPayment`
> / `rejectManualPayment` (owning teacher or Admin, `pending` manual
> payments only), and `markPaymentSucceeded` (system-level, for the
> future gateway webhook — no session, since the caller isn't a
> teacher/admin acting on their own resource).
>
> **Enrollment side effect not wired** — the task description says
> confirming/succeeding should trigger `createEnrollment` (TASK-1101),
> but TASK-1101 depends on *this* task and remains Not Started, so
> there's no `enrollmentService` to call yet. Both transition points
> are marked with `// TODO(TASK-1101)` in `paymentService.ts`. Revisit
> the instant TASK-1101 lands — don't forget, since nothing else will
> flag it.
>
> `POST /api/courses/[courseId]/pay` and the webhook endpoint are
> TASK-1105/1106 (Not Started) — not part of this task, so
> `createPaymentSchema`/`reviewPaymentSchema` exist in
> `payment.schema.ts` but aren't wired to a route yet.
>
> Unit tests in `paymentRepository.test.ts` and `paymentService.test.ts`
> (mocked Firestore/repositories, same limitation as TASK-601/402/603 —
> no emulator/network in this sandbox — could not actually run them
> here to confirm green; written to the same mocking pattern as
> `courseService.test.ts`/`teacherProfileRepository.test.ts`, review
> before trusting).

## TASK-1105: Online payment flow (card/Fawry)
- Description: `POST /api/courses/[courseId]/pay` creates a `pending` payment and starts a gateway checkout session; `POST /api/payments/webhook` verifies the gateway signature and flips the payment to `succeeded`. Gateway choice (e.g. Paymob) to be confirmed — see `features/payments.md`.
- Dependencies: TASK-1104
- Status: Not Started

## TASK-1106: Manual payment flow (Vodafone Cash / bank transfer)
- Description: Student submits a `pending` manual payment with a reference note; teacher/Admin confirm or reject it (surfaced in TASK-704's queue and an Admin-side equivalent).
- Dependencies: TASK-1104
- Status: Not Started
