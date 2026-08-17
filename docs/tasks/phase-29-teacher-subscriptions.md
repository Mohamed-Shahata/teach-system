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
- Status: Not Started

## TASK-2908: Admin UI — offerings & subscriptions management
- Description: No page under `app/[locale]` references `subscription`/`offering` yet — this whole system is backend-only, reachable only by calling the API routes directly. Needs an Admin-facing UI: manage a teacher's offerings, set up/cancel a student's subscriptions, review pending invoices (likely alongside `PaymentsQueue`'s pattern, TASK-704/1106).
- Dependencies: TASK-2902, TASK-2904, TASK-2906
- Affected modules: new `components/admin/*` components, new `app/[locale]/(protected)/admin/*` pages
- Status: Not Started

## TASK-2909: Teacher/student-facing invoice views
- Description: `GET /api/teacher/subscription-invoices` and `GET /api/student/subscription-invoices` exist but nothing renders them — teacher/student dashboards should surface subscription invoice history/status the way `student/dashboard` surfaces course enrollments (TASK-1103).
- Dependencies: TASK-2906
- Affected modules: `components/teacher/*`, `components/student/*`, relevant dashboard pages
- Status: Not Started

## TASK-2910: `docs/features/subscriptions.md`
- Description: A dedicated features doc for this system, matching the depth of `docs/features/payments.md`/`docs/features/enrollment.md` — currently the only documentation is this phase file, `collections.md`'s field tables, and `api/README.md`'s route list.
- Dependencies: TASK-2901–2906 (documents what exists)
- Affected modules: `docs/features/subscriptions.md`, `docs/features/README.md` (add to the index)
- Status: Not Started
