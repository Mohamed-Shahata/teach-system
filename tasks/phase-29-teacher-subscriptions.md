# Phase 29 — Teacher Subscriptions & Offerings

> Opened during the TASK-1802 documentation audit. The
> repositories/services/schemas/routes for this phase were already
> fully implemented in the codebase with no task file, no
> `database/collections.md` entry, and no `firestore.rules` coverage
> — see the TASK-1802 note in `phase-18-mvp-finalization.md` for how
> this was found. Confirmed with the project owner: this is an
> intentional, active feature (not an abandoned experiment), so it
> gets a real phase file here rather than staying undocumented.
> TASK IDs below are newly assigned (`TASK-29xx`) since none existed;
> the in-code comments referencing an untracked "Phase 3"/"Phase 6"
> are superseded by this file going forward.
>
> This is a second, parallel payment/access model alongside the
> course-based `enrollments`/`payments` system (Phase 11): the Admin
> prices a teacher's subject-at-a-grade-level as a monthly
> `teacherOfferings` offering, sets a student up with a `subscriptions`
> doc against one, and bills it period-by-period via
> `subscriptionInvoices` (manual review, same `pending → confirmed /
> rejected` shape `paymentService` uses). See
> `database/collections.md`'s `teacherOfferings`/`subscriptions`/
> `subscriptionInvoices` entries for the full field-level shape, and
> `api/README.md`'s "Admin — teacher subscriptions & offerings"
> section for the ten routes.

## TASK-2901: Offerings repository, service & schema
- Description: `teacherOfferings/{offeringId}` — Admin prices one of a teacher's subjects at one grade level. One offering per `(teacherId, subjectId, stageId)`, enforced at the service layer.
- Dependencies: TASK-501 (Admin role), TASK-2402 (teacher subject list)
- Affected modules: `lib/validation/teacherOffering.schema.ts`, `lib/server/repositories/teacherOfferingRepository.ts`, `lib/server/services/teacherOfferingService.ts`
- Status: Done (found already implemented; retroactively documented)

## TASK-2902: Offerings API routes
- Description: Admin-facing CRUD for offerings, both center-wide and per-teacher.
- Dependencies: TASK-2901
- Affected modules: `app/api/admin/offerings/route.ts`, `app/api/admin/offerings/[offeringId]/route.ts`, `app/api/admin/teachers/[teacherId]/offerings/route.ts`
- Status: Done (found already implemented; retroactively documented)

## TASK-2903: Subscriptions repository, service & schema
- Description: `subscriptions/{subscriptionId}` — a student's standing monthly subscription to one teacher for one priced offering. Deliberately separate from `enrollments` (course-scoped, payments-gated) — this is the higher-level teacher+subject+stage relationship.
- Dependencies: TASK-2901
- Affected modules: `lib/validation/subscription.schema.ts`, `lib/server/repositories/subscriptionRepository.ts`, `lib/server/services/subscriptionService.ts`
- Status: Done (found already implemented; retroactively documented)

## TASK-2904: Subscriptions API routes
- Description: Admin creates/cancels a student's subscriptions against an offering.
- Dependencies: TASK-2903
- Affected modules: `app/api/admin/students/[studentId]/subscriptions/route.ts`, `app/api/admin/subscriptions/[subscriptionId]/route.ts`
- Status: Done (found already implemented; retroactively documented)

## TASK-2905: Subscription invoices repository, service & schema
- Description: `subscriptionInvoices/{invoiceId}` — one month's bill for one subscription, `pending → confirmed / rejected`, one invoice per `(subscriptionId, period)`.
- Dependencies: TASK-2903
- Affected modules: `lib/validation/subscriptionInvoice.schema.ts`, `lib/server/repositories/subscriptionInvoiceRepository.ts`, `lib/server/services/subscriptionInvoiceService.ts`
- Status: Done (found already implemented; retroactively documented)

## TASK-2906: Subscription invoice API routes
- Description: Generate (single + bulk) and manually review invoices; teacher/student read their own.
- Dependencies: TASK-2905
- Affected modules: `app/api/admin/subscriptions/[subscriptionId]/invoices/route.ts`, `app/api/admin/subscription-invoices/[invoiceId]/route.ts`, `app/api/admin/subscription-invoices/generate/route.ts`, `app/api/teacher/subscription-invoices/route.ts`, `app/api/student/subscription-invoices/route.ts`
- Status: Done (found already implemented; retroactively documented)

## TASK-2907: Firestore rules for offerings/subscriptions/invoices
- Description: `firestore.rules` currently has zero entries for `teacherOfferings`, `subscriptions`, or `subscriptionInvoices` — not a live vulnerability today (every repository above reads/writes exclusively through `adminDb`, the Admin SDK, which bypasses rules entirely, and there's no catch-all `allow` in the rules file, so all three deny-by-default against direct client access) but it's a documentation/defense-in-depth gap against TASK-1501/1603's "every collection has rule coverage" claim, and blocks ever calling these from a client SDK later without a rules review.
- Dependencies: TASK-2901, TASK-2903, TASK-2905
- Affected modules: `firestore.rules`, `test/firestore.rules.test.ts`
- Status: Done

> Added `teacherOfferings`, `subscriptions`, and `subscriptionInvoices`
> entries to `firestore.rules`, following the same "Admin SDK is the
> live path, this is a defense-in-depth floor" framing already used for
> `questions`/`files`. All three collections deny client-side write to
> anyone but the Admin, matching how each is actually created/reviewed
> today (Admin prices offerings, Admin sets up/cancels subscriptions,
> Admin generates and reviews invoices — see this phase's intro note);
> the owning teacher and the subscribed/billed student get read-only
> access, same shape as `payments`/`enrollments`'s owner-read rules.
> Emulator-based tests added to `test/firestore.rules.test.ts` (one
> `describe` block per collection, read/write allow-deny pairs) —
> written to the same pattern as the existing `reviews`/`lessonProgress`
> blocks; could not actually run them here (no Firestore emulator in
> this sandbox, same long-standing limitation as TASK-601/1501/1503/1603
> — run manually via `firebase emulators:start --only firestore` +
> `npx vitest run test/firestore.rules.test.ts`). No i18n/RTL/theme
> surface — rules + rules tests only, no client-visible strings.
> TASK-2908 (Admin UI) is next in this phase — its dependencies
> (TASK-2902, TASK-2904, TASK-2906) are already `Done`.

## TASK-2908: Admin UI — offerings & subscriptions management
- Description: No page under `app/[locale]` references `subscription`/`offering` yet — this whole system is backend-only, reachable only by calling the API routes directly. Needs an Admin-facing UI: manage a teacher's offerings, set up/cancel a student's subscriptions, review pending invoices (likely alongside `PaymentsQueue`'s pattern, TASK-704/1106).
- Dependencies: TASK-2902, TASK-2904, TASK-2906
- Affected modules: new `components/admin/*` components, new `app/[locale]/(protected)/admin/*` pages
- Status: Done

> Found two of the three pieces already implemented (undocumented, same
> "found already implemented" pattern as TASK-2901–2906 themselves):
> `TeacherManager`'s "Offerings" row action (`TeacherOfferingsDialog`)
> already priced/removed a teacher's `(subject, stage)` offerings, and
> `StudentManager`'s "Subscriptions" row action (`StudentSubscriptionsDialog`)
> already subscribed/cancelled a student's subscriptions and generated
> a single invoice per subscription. What was actually missing — the
> only gap this task closed — is the pending-invoice **review** queue:
> nothing anywhere called `PATCH /api/admin/subscription-invoices/[id]`
> to confirm/reject a bill, and there was no bulk "run this month's
> billing" trigger for `POST /api/admin/subscription-invoices/generate`.
> Added `SubscriptionInvoicesQueue` (`PaymentsQueue`-shaped, TASK-704)
> plus a new `admin/subscription-invoices` page and sidebar nav entry —
> backed entirely by already-existing routes/services
> (`subscriptionInvoiceService.listForTeacher`/`reviewInvoice`/
> `generateForAllActiveSubscriptions`, which already worked for an Admin
> session via the same `scopeToTeacher` Admin-bypass `paymentRepository`
> uses, TASK-1106's note) — no new API surface needed. `en.json`/`ar.json`
> gained a `adminDashboard.subscriptionInvoices` namespace (both files
> re-checked for 1:1 key parity). No RTL-unsafe physical `left`/`right`
> classes introduced. Could not run `npm install`/`next build`/
> `vitest`/`eslint` here — no network and no `node_modules` in this
> sandbox, same long-standing limitation as TASK-2907 and earlier;
> review before trusting. TASK-2909 (teacher/student-facing invoice
> views) is next — its only dependency, TASK-2906, is already `Done`.

## TASK-2909: Teacher/student-facing invoice views
- Description: `GET /api/teacher/subscription-invoices` and `GET /api/student/subscription-invoices` exist but nothing renders them — teacher/student dashboards should surface subscription invoice history/status the way `student/dashboard` surfaces course enrollments (TASK-1103).
- Dependencies: TASK-2906
- Affected modules: `components/teacher/*`, `components/student/*`, relevant dashboard pages
- Status: Done

> Two components, one per role, mounted on each existing dashboard page
> (`teacher/dashboard`, `student/dashboard`) rather than new routes —
> matching how `PaymentsQueue` (TASK-704) already lives directly on
> `teacher/dashboard`, not a separate page. Both fetch server-side via
> `subscriptionInvoiceService.listForTeacher(session)` /
> `listForStudent(session)` (both already existed, TASK-2905/2906) —
> neither of `GET /api/teacher/subscription-invoices` /
> `GET /api/student/subscription-invoices` needed to be called from the
> client, since the initial server-rendered list is all either view
> needs.
>
> `components/teacher/subscription-invoices-panel.tsx` is a
> `PaymentsQueue`-shaped client component: pending invoices get
> confirm/reject actions, reviewed ones show their resulting status.
> Reuses TASK-2908's existing `PATCH /api/admin/subscription-invoices/
> [invoiceId]` route rather than adding a `teacher`-prefixed duplicate —
> that route already authorizes by session role/ownership
> (`subscriptionInvoiceService.reviewInvoice` → `assertRole(session,
> "teacher", "admin")` + `assertWritableByTeacher`), not by URL prefix,
> so it was already teacher-callable, just never called from anywhere
> but the Admin queue.
>
> `components/student/subscription-invoices-panel.tsx` is read-only (no
> `"use client"` needed) — a student never reviews their own invoice,
> unlike the teacher — and renders nothing when the student has no
> subscription invoices at all, same "nothing to show" convention as
> `ReviewsPanel`/`PaymentsQueue`'s empty states, so it never appears for
> the (currently: everyone, since Phase 29 sign-up is Admin-manual-only)
> student with no subscription.
>
> `en.json`/`ar.json` gained `teacherDashboard.subscriptionInvoices` and
> `studentDashboard.subscriptionInvoices` namespaces (887 keys each,
> parity re-checked). No RTL-unsafe physical `left`/`right` classes
> introduced — logical `ps-`/`text-end`/`justify-end` throughout, same
> as the rest of both dashboards. Could not run `npm install`/
> `next build`/`vitest`/`eslint` here — no network and no `node_modules`
> in this sandbox, same limitation as TASK-2907/2908; review before
> trusting. This closes out every task in Phase 29 (TASK-2901–2909);
> only TASK-2910 (`docs/features/subscriptions.md`) remains.

## TASK-2910: `docs/features/subscriptions.md`
- Description: A dedicated features doc for this system, matching the depth of `docs/features/payments.md`/`docs/features/enrollment.md` — currently the only documentation is this phase file, `collections.md`'s field tables, and `api/README.md`'s route list.
- Dependencies: TASK-2901–2906 (documents what exists)
- Affected modules: `docs/features/subscriptions.md`, `docs/features/README.md` (add to the index)
- Status: Done

> Written to the same shape as `payments.md`/`enrollment.md` (Purpose,
> a concepts table for the three collections, User stories,
> Data, Authorization, UI, Edge cases) — plus a UI section the other
> two files don't need, since this feature's UI (TASK-2908/2909) postdates
> both of them. Documents everything through TASK-2909: the Admin
> offerings/subscriptions dialogs on `TeacherManager`/`StudentManager`,
> the `admin/subscription-invoices` review queue, and both dashboard
> panels. Added to `docs/features/README.md`'s index. This closes out
> Phase 29 — all nine tasks (TASK-2901–2910) are now `Done`.
