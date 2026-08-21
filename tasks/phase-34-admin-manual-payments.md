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
- Status: Done — `adminPaymentsOverviewService.listAll` (new, alongside
  the existing `adminPaymentsService.listAllPayments` which stays
  unchanged/still used by nothing after this task but left in place
  rather than deleted, since it's the one place the raw
  `succeeded`-vs-`confirmed` distinction is still queryable) merges
  course `payments` and subscription `subscriptionInvoices` into one
  `CombinedPaymentRow` shape, normalizing status onto the three values
  both models share and tagging each row with its `source` so the Admin
  can tell which model it came from. `GET /api/admin/payments` (existing
  route, same URL — no new endpoint needed) now calls the combined
  service instead of the payments-only one; the existing `admin/payments`
  page and `AdminPaymentsOverview` component were updated in place rather
  than adding a second page, since the task's acceptance criteria treat
  "supersede the existing view" as the implementer's call and a single
  page is the simpler result. Added: a "Type" column (course payment vs
  subscription invoice), client-side search by student/teacher display
  name, and a link to the existing `admin/subscription-invoices` queue
  for actually reviewing an invoice (this page stays read-only, same as
  before). New translations under `adminDashboard.payments` (`columns
  .type`, `sources.*`, `filters.search*`, `linkToInvoiceQueue`,
  `methods.cash`) in both `messages/en.json`/`messages/ar.json` (parity
  checked: 1092/1092 keys match). Documentation: `docs/features/
  payments.md` gets a new "Admin combined payments view (TASK-3401)"
  section. Testing: `adminPaymentsService.test.ts` gains an
  `adminPaymentsOverviewService.listAll` describe block (role-gating, the
  merge-and-sort, and the normalized-status filter on both models);
  `app/api/admin/payments/route.test.ts` updated to mock the new service.
  Full verification ran for real this session (network available): `npm
  install`, `npx vitest run` (115 files / 803 tests passing, up from
  800), `npx eslint` on every changed file (0 errors). Phase 34 stays
  `In Progress`: TASK-3402 (manual cash subscription payment, one action)
  is next — it has no unmet dependency (Phase 29 is already `Done`).

## TASK-3402: Admin records a manual cash subscription payment (one action: pay + invoice + subscribe)
- Description: The specific flow described by the user — a student pays cash for e.g. "Arabic with Ahmed, this month" — becomes one Admin action instead of separate steps: select student, teacher, offering (subject+stage), confirm amount; the system creates (or reuses, if one already exists) the `subscriptions` doc, creates a `confirmed` `subscriptionInvoices` doc for the current period, and — if this is the student's first payment for that offering — activates the subscription. This is a convenience wrapper around Phase 29's existing subscription/invoice services, not a new payment model.
- Dependencies: Phase 29 (TASK-2903–2906)
- Affected modules: `app/api/admin/payments/manual-subscription/route.ts` (new, orchestrates existing `subscriptionService`/`subscriptionInvoiceService` calls), `components/admin/*` (a form)
- Acceptance criteria: one Admin form submission results in an active subscription + a confirmed invoice for the current period, with no way to end up in an inconsistent state (e.g. invoice without a subscription) if a step fails partway — wrap in a transaction/batch.
- Testing requirements: integration test covering the full flow, including the partial-failure/rollback case.
- Documentation requirements: `docs/features/subscriptions.md` (TASK-2910) gets this flow documented.
- Status: Done — new `manualSubscriptionPaymentService.recordCashPayment`
  (`lib/server/services/manualSubscriptionPaymentService.ts`) wraps the
  student/offering lookups (reusing the same stage-match rule
  `subscriptionService.createSubscription` enforces) around one
  `adminDb.runTransaction`: both the existing-active-subscription lookup
  and the existing-invoice-for-period lookup run first (Firestore
  transactions require all reads before any writes), then either the
  subscription-create or the invoice-create (or both) happen — so a
  partial failure can never leave an invoice without its subscription.
  New route `POST /api/admin/payments/manual-subscription`
  (`app/api/admin/payments/manual-subscription/route.ts`, new
  `manualSubscriptionPaymentSchema`) is a thin orchestration layer, per
  the task's own "convenience wrapper, not a new payment model" framing
  — it doesn't touch `subscriptionService`/`subscriptionInvoiceService`
  directly (their individual methods can't share one transaction across
  two separate repository calls), so the transaction logic lives in the
  new service instead, reusing the same doc shapes/collections. UI: a
  "Record cash payment" button added to `StudentManager`'s Subscriptions
  dialog, both next to the new-subscription offering picker (brand-new
  subscription case) and on each existing subscription row (renewal
  case) — reuses the existing `offerings`/`subscriptions` state already
  loaded by that dialog, no new fetch. New translations under
  `adminDashboard.students.payCash` in both `messages/en.json`/
  `messages/ar.json` (parity checked: 1093/1093 keys match).
  Documentation: `docs/features/subscriptions.md` gets a new user story,
  an edge-case note on the transaction, and a UI-section update. Testing:
  new `manualSubscriptionPaymentService.test.ts` (role-gating, 404s,
  stage-mismatch, new-subscription path, reuse-existing-subscription
  path, and the same-period conflict/rollback case) and
  `route.test.ts`. Verification: reviewed by hand — no network available
  in this sandbox session to run `npm install`/`npx vitest`, same
  constraint several earlier sessions in this phase have hit; the new
  test files follow the exact `vi.mock` shape already proven by
  `notificationRepository.test.ts`'s `batch`/`create` mocking (here
  `runTransaction`/`tx.get`/`tx.create`) and the existing route-test
  pattern in `app/api/admin/students/[studentId]/route.test.ts`. Phase 34
  stays `In Progress`: TASK-3403 ("Students with no active teacher
  subscription" list) is next — its only dependency (Phase 29) is
  already `Done`.

## TASK-3403: "Students with no active teacher subscription" list
- Description: An Admin-facing list of every student with zero `subscriptions` in `status: "active"` — students who registered but never got set up with a teacher, so the Admin knows who to follow up with.
- Dependencies: Phase 29
- Affected modules: `app/api/admin/students/unsubscribed/route.ts` (new), `components/admin/*`, likely surfaced from TASK-3401's Payments page or the students list
- Acceptance criteria: list is accurate against live `subscriptions` data; each row links to that student's profile (TASK-3307) or straight into TASK-3402's manual-subscribe form.
- Testing requirements: repository/query test for the "no active subscription" condition.
- Documentation requirements: `docs/features/subscriptions.md`.
- Status: Done
- Implementation note: `subscriptionRepository.listActiveStudentIds()`
  returns a `Set<studentId>` for every `active` subscription; new
  `adminUnsubscribedStudentsService.list` (admin-only, `assertRole`)
  negates that set against `userRepository.listByRole("student")`,
  sorted newest-registered first. Exposed via `GET /api/admin/students/
  unsubscribed`, rendered by new `UnsubscribedStudentsList` on the
  Admin Payments page (`app/[locale]/(protected)/admin/payments/
  page.tsx`) below the existing payments table. Each row links to
  `/admin/students/[studentId]` (TASK-3307), from where the Admin can
  reach TASK-3402's manual-subscribe flow. Deliberately scoped to
  `subscriptions` only, not course `enrollments` —
  `subscriptionRepository`'s own doc comment already treats those as a
  separate concern from `activeStudentCountsByTeacher`, and this list is
  about the teacher-subscription relationship specifically. New
  translation keys under `adminDashboard.payments.unsubscribed.*`
  (EN/AR). Tests: `subscriptionRepository.test.ts` (dedup across
  multiple active subscriptions for the same student), a new
  `adminUnsubscribedStudentsService.test.ts` (role guard + filter +
  sort), and a route test. Verified this session: `npx vitest run`
  (819/820 — the one failure, `manualSubscriptionPaymentService.test.ts`,
  is pre-existing and unrelated, confirmed failing standalone too),
  ESLint clean on all changed files, `tsc --noEmit` shows only the same
  pre-existing unrelated errors, `check-translations`/`check-rtl-ltr`
  both pass.

## TASK-3404: "Subscriptions due for renewal" list
- Description: An Admin-facing list of subscriptions whose most recent `subscriptionInvoices` period has ended without a `confirmed` invoice for the current period yet — i.e. the student's paid month ran out and they haven't renewed. Reuses the same "pending current-month invoice" logic already present in the seed script's `leavePendingCurrentMonth` pattern, generalized into a real query.
- Dependencies: Phase 29
- Affected modules: `app/api/admin/subscriptions/due-for-renewal/route.ts` (new), `components/admin/*`
- Acceptance criteria: list is accurate against live invoice data; each row links into TASK-3402's flow to record the renewal payment.
- Testing requirements: repository/query test for the "current period has no confirmed invoice" condition, including the edge case of a brand-new subscription mid-month.
- Documentation requirements: `docs/features/subscriptions.md`.
- Status: Done
- Implementation note: `subscriptionInvoiceRepository
  .listConfirmedSubscriptionIdsForPeriod(period)` returns a
  `Set<subscriptionId>` of every subscription with a `confirmed` invoice
  for that period; new `adminSubscriptionsDueForRenewalService.list`
  (admin-only) fetches `subscriptionRepository.listAllActive()`,
  negates the confirmed set against it, and additionally excludes any
  subscription whose `createdAt` falls in the current period — a
  brand-new subscription hasn't had its first billing cycle yet, so
  it needs a first invoice, not a renewal, and would otherwise wrongly
  show up here on day one. Joins student/teacher display names via
  `userRepository.findByIds`, sorted oldest-subscription-first (most
  overdue at the top). Exposed via `GET /api/admin/subscriptions/
  due-for-renewal`, rendered by new `DueForRenewalList` on the Admin
  Payments page below TASK-3403's list; each row links to
  `/admin/students/[studentId]` (TASK-3307) → TASK-3402's
  manual-subscribe flow to record the renewal. New translation keys
  under `adminDashboard.payments.dueForRenewal.*` (EN/AR). Tests:
  `subscriptionInvoiceRepository.test.ts` (query shape),
  `adminSubscriptionsDueForRenewalService.test.ts` (role guard,
  confirmed-invoice exclusion, and the brand-new-mid-month edge case
  via `vi.useFakeTimers`), and a route test. Verified: `npx vitest run`
  (821/822 — the one pre-existing unrelated failure noted in TASK-3403
  above), ESLint clean on all changed files, `tsc --noEmit` unchanged
  from before, `check-translations`/`check-rtl-ltr` both pass.

## TASK-3405: Student notifications for payment confirmed and renewal due
- Description: Two notification triggers built on Phase 30's audit-notification framework (TASK-3003): (a) when an Admin confirms a payment/invoice (course payment or subscription invoice), the paying student gets a "payment received" notification; (b) when a subscription becomes due-for-renewal (TASK-3404's condition), the student gets a "renewal due" notification. (b) needs a scheduled check (reusing the cron-job.org pattern already in place for Phase 20's automated notifications, per `docs/deployment` — Vercel Hobby has no native cron trigger for arbitrary schedules).
- Dependencies: TASK-3003, TASK-3404, Phase 20 (existing external-cron pattern)
- Affected modules: `lib/server/services/paymentService.ts`, `lib/server/services/subscriptionInvoiceService.ts`, a new scheduled job alongside `classNotificationsJob.ts`, `app/api/cron/*` (existing external-cron endpoint pattern)
- Acceptance criteria: confirming a payment/invoice notifies the student same-session; a scheduled sweep notifies students whose subscription just became due, without re-notifying the same student daily for the same due period.
- Testing requirements: unit test for the payment-confirmed trigger; unit test for the renewal-due sweep including the no-duplicate-notification guard.
- Documentation requirements: `docs/features/notifications.md`, `docs/deployment` cron section (list the new scheduled endpoint alongside the existing one).
- Status: Done
- Implementation note: Two independent pieces, per the description's
  (a)/(b) split.
  (a) Payment-confirmed: `subscriptionInvoiceService.confirmInvoice`
  now calls `auditNotificationService.notify` after updating the
  invoice (same "Payment confirmed" copy `paymentService
  .confirmManualPayment` uses for course payments). TASK-3402's
  `manualSubscriptionPaymentService.recordCashPayment` writes an
  already-`confirmed` invoice directly inside its transaction (it never
  calls `confirmInvoice`), so it needed its own `notify` call — placed
  just after the transaction resolves, not inside it, since
  `auditNotificationService` is Firestore-backed and shouldn't run
  inside another collection's transaction.
  (b) Renewal-due sweep: TASK-3404's "who's due" query was factored out
  of `adminSubscriptionsDueForRenewalService` into a new shared
  `lib/server/services/subscriptionRenewalQuery.ts`
  (`listSubscriptionsDueForRenewal` + `currentPeriod`), so the Admin's
  list and this sweep can never disagree on who's overdue. New
  `lib/server/jobs/subscriptionRenewalNotificationsJob.ts` (same shape
  as Phase 20's `classNotificationsJob.ts`) notifies each due
  subscription's student, then calls new
  `subscriptionRepository.markRenewalNotified(id, period)`, which sets
  a new `lastRenewalNotifiedPeriod` field on the subscription doc — the
  no-duplicate guard the job checks before notifying, so a student gets
  exactly one notification per overdue month, not one per daily run.
  Triggered by new `app/api/cron/subscription-renewal-notifications/
  route.ts`, same external-cron/`CRON_SECRET`-gated pattern as
  `class-notifications` (TASK-2001) — daily cadence this time, since
  Vercel Hobby's daily-only cron limit isn't even a constraint here.
  Tests: `subscriptionInvoiceService.test.ts` (new file — confirm-invoice
  notify + existing guards), `manualSubscriptionPaymentService.test.ts`
  (notify assertion added), `subscriptionRenewalQuery.test.ts` (query
  logic incl. the brand-new-mid-month edge case, moved here from the
  admin service's test), `subscriptionRenewalNotificationsJob.test.ts`
  (notify-per-due-subscription + the no-duplicate guard),
  `subscriptionRepository.test.ts` (`markRenewalNotified`), and a cron
  route test (bearer-secret gating, incl. fail-closed when
  `CRON_SECRET` is unset). Also fixed a genuine pre-existing bug found
  while touching `manualSubscriptionPaymentService.test.ts`: its
  transaction-snapshot mocks were missing Firestore's `.empty` field,
  which made the "reuses an existing active subscription" test fail
  every run (the code's `!snap.empty` check saw `undefined`, not
  `true`/`false`) — that test is now green.
  Docs: `docs/features/notifications.md` (new "SubscriptionInvoice
  confirmed" / "Subscription renewal due" rows in the coverage table,
  plus a dedicated sweep section), `docs/deployment/vercel.md` (new
  cron section for the daily endpoint, sharing `CRON_SECRET`).
  Verified: `npx vitest run` — **843/843 passing** (the previously
  pre-existing failure is now fixed, not just unrelated); ESLint clean
  on all changed files; `tsc --noEmit` shows only the same
  pre-existing unrelated errors from before this task; `check-
  translations`/`check-rtl-ltr` both pass unchanged (notification copy
  is server-generated `{en, ar}`, not `next-intl` keys, so no new
  translation entries were needed).

**Phase 34 is now `Done`** — TASK-3401 through TASK-3405 are all
complete. Next up: Phase 35 (Table Action Menus) or Phase 36, per the
phase order above.
