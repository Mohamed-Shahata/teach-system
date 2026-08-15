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
- As a teacher, I can create a student and enroll them directly in one
  of my own courses (bypassing the payment flow, e.g. they paid in
  person — this still creates a `payments` record with method
  `bank_transfer`/manual and `status: "confirmed"`, for a consistent
  audit trail).

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
