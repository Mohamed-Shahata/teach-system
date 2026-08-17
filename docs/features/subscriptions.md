# Feature: Teacher Subscriptions & Offerings

## Purpose
A second, parallel payment/access model alongside the course-based
`enrollments`/`payments` system (`features/enrollment.md`,
`features/payments.md`). Where an enrollment ties a student to one
specific `course`'s lessons, a subscription is the higher-level "this
student studies with this teacher, this subject, this grade" standing
relationship — the Admin prices it, sets a student up against it, and
bills it month by month.

## Concepts

| Collection | Purpose |
|---|---|
| `teacherOfferings/{offeringId}` | Admin-set monthly price for one of a teacher's subjects at one grade level (e.g. "Physics, Grade 3 Secondary — 350 EGP/month"). One offering per `(teacherId, subjectId, stageId)`. |
| `subscriptions/{subscriptionId}` | A student's standing monthly subscription to one teacher for one priced offering. `active` or `cancelled`. |
| `subscriptionInvoices/{invoiceId}` | One month's bill for one subscription — `pending → confirmed / rejected`, mirroring `payments`' manual-review shape. One invoice per `(subscriptionId, period)`, `period` as `YYYY-MM`. |

See `database/collections.md` for the full field-level shape of each,
and `api/README.md`'s "Admin — teacher subscriptions & offerings"
section for the complete route list.

## User stories
- As an Admin, I price one of a teacher's subjects at one grade level
  (an offering), so I can subscribe students to it.
- As an Admin, I subscribe a student to a teacher's offering (their
  grade level must match the offering's `stageId`), and can cancel a
  subscription later.
- As an Admin, I generate this month's invoice for one subscription, or
  run monthly billing for every active subscription at once — each
  invoice is idempotent per `(subscriptionId, period)`, so re-running
  billing never double-bills.
- As an Admin or the owning teacher, I review a `pending` invoice and
  confirm it (payment received) or reject it (no-show), optionally with
  a payment method and reference note — same shape as reviewing a
  manual `payments` doc.
- As a teacher, I see my own subscribed students' invoices — pending
  ones with confirm/reject actions, reviewed ones showing their
  resulting status — on my dashboard, alongside my course-payments
  queue.
- As a student, I see my own subscription invoice history/status
  (read-only — I never review my own bill) on my dashboard.

## Data
`teacherOfferings`, `subscriptions`, and `subscriptionInvoices` — see
`database/collections.md`. All three are written exclusively by the
Admin (offerings/subscriptions) or generated/reviewed by the Admin or
owning teacher (invoices); there is no client-facing create path for a
student on any of the three.

`subscriptionInvoiceService.generateInvoice` /
`generateForAllActiveSubscriptions` always price a new invoice from the
subscription's `teacherOfferings.monthlyPrice` — never client input,
the same rule `paymentService.createPayment` follows for course prices.

## Authorization
- **`teacherOfferings`**: Admin reads/writes any; the owning teacher may
  read their own priced offerings (to see what they're priced at), but
  never write.
- **`subscriptions`**: Admin reads/writes any (create/cancel); the
  owning teacher and the subscribed student may read, never write.
- **`subscriptionInvoices`**: Admin generates and reviews any; the
  owning teacher may also review (`confirm`/`reject`) a `pending`
  invoice for one of their own subscriptions — the same "owning
  teacher or Admin" shape `paymentService.confirmManualPayment` /
  `rejectManualPayment` uses. The owning teacher and the billed student
  may read their own invoices; a student never creates or reviews one.

`firestore.rules` covers all three collections as a defense-in-depth
floor (every repository above reads/writes exclusively through the
Admin SDK today, which bypasses these rules) — write is Admin-only on
the client-SDK path even where the service layer additionally allows a
teacher to review an invoice server-side.

## UI
- **Admin**: `TeacherManager`'s "Offerings" row action manages a
  teacher's priced `(subject, stage)` offerings; `StudentManager`'s
  "Subscriptions" row action sets up/cancels a student's subscriptions
  and generates a single invoice; the `admin/subscription-invoices`
  page (linked from the sidebar) is the center-wide pending-invoice
  review queue plus a "generate this month's invoices" bulk action.
- **Teacher**: `SubscriptionInvoicesPanel` on `teacher/dashboard` —
  pending invoices for the teacher's own subscribed students get
  confirm/reject actions; reviewed ones show their resulting status.
  Reuses the Admin review route (`PATCH /api/admin/subscription-
  invoices/[invoiceId]`), which already authorizes by session
  role/ownership rather than URL prefix.
- **Student**: a read-only `SubscriptionInvoicesPanel` on
  `student/dashboard`, showing period/amount/status per invoice.
  Renders nothing for a student with no subscription invoices at all.

## Edge cases
- A student can only be subscribed to an offering whose `stageId`
  matches their own `users/{uid}.stageId` — enforced server-side in
  `subscriptionService.createSubscription`.
- Subscribing a student to an offering they're already actively
  subscribed to conflicts rather than creating a duplicate
  (`findActiveByStudentAndOffering`).
- Generating an invoice for a `cancelled` subscription is rejected;
  bulk billing (`generateForAllActiveSubscriptions`) only ever
  considers `active` subscriptions and silently skips any that already
  have an invoice for the target period instead of failing the batch.
- Reviewing (`confirm`/`reject`) an invoice that isn't `pending` is
  rejected — the state machine is one-way, same as `payments`.
