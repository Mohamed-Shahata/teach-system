# Phase 34 — Admin Manual Payments & Subscription Oversight

> Third post-MVP feature batch (user request, this session). No
> online payment gateway is integrated yet (Paymob etc.) — every
> payment today is cash/transfer, manually reconciled by the Admin.
> This phase gives that manual flow a proper dedicated UI, plus the
> two "who needs attention" lists the user asked for and the
> payment-related student notifications from Phase 30's audit
> framework.

## TASK-3401: Admin "Payments" section (dedicated page)
- Description: A dedicated Admin nav item/page distinct from the existing scattered payment-review UI (`PaymentsQueue`, Phase 7/11) — a single place covering both payment models: course `payments` (Phase 11) and subscription `subscriptionInvoices` (Phase 29), with status filters (pending/confirmed/rejected) and search by student/teacher.
- Dependencies: Phase 11 (`payments`), Phase 29 (`subscriptionInvoices`)
- Affected modules: `app/[locale]/(protected)/admin/payments/page.tsx` (new), `components/admin/*`
- Acceptance criteria: single page lists both payment types with working filters/search; existing per-teacher/per-page payment review UIs can link here or be superseded (implementer's call, noted at build time).
- Testing requirements: component test for filtering/search; API test if a new combined-listing endpoint is added.
- Documentation requirements: `docs/features/payments.md` updated with the new page.
- Status: Not Started

## TASK-3402: Admin records a manual cash subscription payment (one action: pay + invoice + subscribe)
- Description: The specific flow described by the user — a student pays cash for e.g. "Arabic with Ahmed, this month" — becomes one Admin action instead of separate steps: select student, teacher, offering (subject+stage), confirm amount; the system creates (or reuses, if one already exists) the `subscriptions` doc, creates a `confirmed` `subscriptionInvoices` doc for the current period, and — if this is the student's first payment for that offering — activates the subscription. This is a convenience wrapper around Phase 29's existing subscription/invoice services, not a new payment model.
- Dependencies: Phase 29 (TASK-2903–2906)
- Affected modules: `app/api/admin/payments/manual-subscription/route.ts` (new, orchestrates existing `subscriptionService`/`subscriptionInvoiceService` calls), `components/admin/*` (a form)
- Acceptance criteria: one Admin form submission results in an active subscription + a confirmed invoice for the current period, with no way to end up in an inconsistent state (e.g. invoice without a subscription) if a step fails partway — wrap in a transaction/batch.
- Testing requirements: integration test covering the full flow, including the partial-failure/rollback case.
- Documentation requirements: `docs/features/subscriptions.md` (TASK-2910) gets this flow documented.
- Status: Not Started

## TASK-3403: "Students with no active teacher subscription" list
- Description: An Admin-facing list of every student with zero `subscriptions` in `status: "active"` — students who registered but never got set up with a teacher, so the Admin knows who to follow up with.
- Dependencies: Phase 29
- Affected modules: `app/api/admin/students/unsubscribed/route.ts` (new), `components/admin/*`, likely surfaced from TASK-3401's Payments page or the students list
- Acceptance criteria: list is accurate against live `subscriptions` data; each row links to that student's profile (TASK-3307) or straight into TASK-3402's manual-subscribe form.
- Testing requirements: repository/query test for the "no active subscription" condition.
- Documentation requirements: `docs/features/subscriptions.md`.
- Status: Not Started

## TASK-3404: "Subscriptions due for renewal" list
- Description: An Admin-facing list of subscriptions whose most recent `subscriptionInvoices` period has ended without a `confirmed` invoice for the current period yet — i.e. the student's paid month ran out and they haven't renewed. Reuses the same "pending current-month invoice" logic already present in the seed script's `leavePendingCurrentMonth` pattern, generalized into a real query.
- Dependencies: Phase 29
- Affected modules: `app/api/admin/subscriptions/due-for-renewal/route.ts` (new), `components/admin/*`
- Acceptance criteria: list is accurate against live invoice data; each row links into TASK-3402's flow to record the renewal payment.
- Testing requirements: repository/query test for the "current period has no confirmed invoice" condition, including the edge case of a brand-new subscription mid-month.
- Documentation requirements: `docs/features/subscriptions.md`.
- Status: Not Started

## TASK-3405: Student notifications for payment confirmed and renewal due
- Description: Two notification triggers built on Phase 30's audit-notification framework (TASK-3003): (a) when an Admin confirms a payment/invoice (course payment or subscription invoice), the paying student gets a "payment received" notification; (b) when a subscription becomes due-for-renewal (TASK-3404's condition), the student gets a "renewal due" notification. (b) needs a scheduled check (reusing the cron-job.org pattern already in place for Phase 20's automated notifications, per `docs/deployment` — Vercel Hobby has no native cron trigger for arbitrary schedules).
- Dependencies: TASK-3003, TASK-3404, Phase 20 (existing external-cron pattern)
- Affected modules: `lib/server/services/paymentService.ts`, `lib/server/services/subscriptionInvoiceService.ts`, a new scheduled job alongside `classNotificationsJob.ts`, `app/api/cron/*` (existing external-cron endpoint pattern)
- Acceptance criteria: confirming a payment/invoice notifies the student same-session; a scheduled sweep notifies students whose subscription just became due, without re-notifying the same student daily for the same due period.
- Testing requirements: unit test for the payment-confirmed trigger; unit test for the renewal-due sweep including the no-duplicate-notification guard.
- Documentation requirements: `docs/features/notifications.md`, `docs/deployment` cron section (list the new scheduled endpoint alongside the existing one).
- Status: Not Started
