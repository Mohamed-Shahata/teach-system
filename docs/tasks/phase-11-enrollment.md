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
- Affected modules: `app/api/enrollments/route.ts`, `app/api/enrollments/[enrollmentId]/route.ts`
- Status: Done

> `GET /api/enrollments` — the signed-in student's own enrollments, via
> `enrollmentService.listMyEnrollments` (already role-gated to
> `"student"` there). Optional `?status=` filter, parsed with
> `enrollmentStatusSchema` — same query-param pattern as
> `GET /api/teacher/payments`. `GET /api/enrollments/[enrollmentId]`
> returns one enrollment via `enrollmentService.getEnrollment`, which
> gates access with `assertCanViewEnrollment` (owning student, owning
> teacher, or Admin) rather than hardcoding `"student"` — so this one
> endpoint also serves as the single-enrollment read for teachers/Admin,
> with no separate route needed.
> `PATCH /api/enrollments/[enrollmentId]` is the progress-update
> endpoint — body validated with the already-existing
> `markLessonCompleteSchema` (`{ lessonId }`), delegates to
> `enrollmentService.markLessonComplete`, which recomputes
> `progress.percent` server-side and never accepts a client-supplied
> `status`. No `POST` route: enrollment creation stays exclusively a
> side effect of the payments flow (TASK-1105/1106), per the task
> description and `features/enrollment.md`.
> Unit tests (mocked `requireSession`/`enrollmentService`, same pattern
> as `app/api/teacher/schedule/route.test.ts` /
> `app/api/teacher/payments/route.test.ts`) in
> `app/api/enrollments/route.test.ts` and
> `app/api/enrollments/[enrollmentId]/route.test.ts` — actually run this
> time (`npx vitest run`, full suite: 32 files / 195 tests passing,
> unlike the emulator-blocked tasks upstream) and `npx tsc --noEmit`
> confirmed no new type errors (the 5 pre-existing `PageProps`/
> `LayoutProps` errors are Next.js's generated route types, absent
> without a full `next build`, unrelated to this task).

## TASK-1103: Student "my courses" & progress UI
- Dependencies: TASK-1102, TASK-204
- Affected modules: `app/[locale]/(protected)/student/layout.tsx`, `app/[locale]/(protected)/student/page.tsx`, `app/[locale]/(protected)/student/dashboard/page.tsx`, `components/layout/student-sidebar.tsx`, `messages/en.json`, `messages/ar.json`
- Status: Done

> First real page under `/{locale}/student/*` — `proxy.ts` already
> role-gated that segment and `docs/architecture/folder-structure.md`
> already planned `student/dashboard/page.tsx` as the landing page, but
> nothing existed there yet (only `(protected)/teacher/*`). Followed
> `teacher/layout.tsx` + `teacher/page.tsx` (TASK-701) exactly:
> `student/layout.tsx` wraps `DashboardShell` with a new `StudentSidebar`
> (defense-in-depth role check, redirects a non-student to `/${locale}/${role}`),
> `student/page.tsx` redirects `/student` → `/student/dashboard` so the
> generic post-login/role-mismatch redirects that only know the role
> segment land somewhere real.
> `StudentSidebar` has a single nav item ("My courses") — no other
> student-facing pages exist yet (lesson/quiz views under
> `student/courses/[courseId]/*` are future work per
> folder-structure.md, out of this task's scope).
> `student/dashboard/page.tsx` is the "my courses" list: server
> component, `enrollmentService.listMyEnrollments(session)` (already
> role-gated to `"student"`, TASK-1101) joined to course titles via
> `courseRepository.findByIds` (existing batch lookup, same one
> `student-detail-view.tsx`/TASK-1002 uses). Each course renders as a
> `Card` with a status `Badge` and a progress bar built from
> `enrollment.progress.percent` — read-only here; marking a lesson
> complete is the future lesson-view page's job (TASK-1102's
> `PATCH /api/enrollments/[enrollmentId]`), not this list. Course title
> picks the current locale (`getLocale()`) with an `en`/`ar` fallback,
> matching `LocalizedText`'s shape. Empty state via the existing
> `EmptyState` primitive (TASK-204).
> New `studentDashboard` message namespace added to both `en.json` and
> `ar.json` (256 keys each, `npm run check-translations` passes), status
> labels mirroring the existing `teacherDashboard.students.detail.status`
> wording/keys for consistency. `npm run check-rtl` passes — no physical
> `left`/`right` classes introduced.
> Verified for real this time: `npm install` (628 packages), full
> `npx vitest run` (32 files / 195 tests, unchanged — this task added no
> new test surface of its own since the page has no client-side logic
> to unit test beyond what TASK-1102's route tests already cover),
> `npx eslint` clean on the new files, and a full `npx next build`
> (production build, Turbopack) compiled successfully with both
> `/[locale]/student` and `/[locale]/student/dashboard` listed in the
> route output — this is also what generated the `PageProps`/
> `LayoutProps` types the new `page.tsx`/`layout.tsx` reference, so
> `tsc --noEmit` now resolves them without the caveat noted on
> TASK-1102.

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
- Status: Blocked

> Revisited at its turn (dependency TASK-1104 is Done) and found
> genuinely blocked, not just unattempted: the task's own description
> and `features/payments.md` both flag that the gateway choice itself
> ("Paymob is the common choice... needs to be confirmed before
> implementation — track the decision in a new ADR once chosen") is
> undecided, and no `docs/decisions/000X-*.md` ADR for it exists yet
> (checked all of `docs/decisions/`). There's also no gateway
> credentials/config anywhere (`.env.example`,
> `docs/deployment/environment-variables.md` have nothing gateway-
> related), and this sandbox has no network access to a real provider
> to verify a webhook signature scheme against even if one were picked.
>
> Writing `POST /api/courses/[courseId]/pay` /
> `POST /api/payments/webhook` against a guessed provider's API shape
> would mean re-doing both once the real ADR lands and risks the
> webhook signature check (the actual security-critical part,
> `features/payments.md`'s security notes) being validated against
> nothing real. `paymentService.createPayment` (any method, TASK-1104)
> and `paymentService.markPaymentSucceeded` (system-level, no session,
> TASK-1104) already exist and are provider-agnostic — a route that
> merely calls them is close to a one-line change once (a) the ADR
> picks a gateway and (b) credentials exist to test against. Left
> Blocked rather than partially stubbed so it isn't mistaken for done;
> next step is the ADR, not code.

## TASK-1106: Manual payment flow (Vodafone Cash / bank transfer)
- Description: Student submits a `pending` manual payment with a reference note; teacher/Admin confirm or reject it (surfaced in TASK-704's queue and an Admin-side equivalent).
- Dependencies: TASK-1104
- Affected modules: `app/api/payments/route.ts`, `app/api/payments/[paymentId]/route.ts`
- Status: Done

> The confirm/reject half of this task already existed —
> `PATCH /api/teacher/payments/[paymentId]` + `PaymentsQueue` shipped
> under TASK-704, backed by `paymentService.confirmManualPayment` /
> `rejectManualPayment` (TASK-1104), which already creates the
> enrollment on confirm. An Admin-side queue equivalent isn't built
> (Phase 19, Admin Dashboard, is Not Started) — `GET /api/teacher/payments`
> already works for an Admin session too (`assertRole(session, "teacher",
> "admin")` + `scopeToTeacher`'s Admin bypass, TASK-602), it just has no
> dedicated Admin page yet; revisit there rather than duplicating a
> queue here.
>
> What this task actually landed is the missing student-facing half:
> `POST /api/payments` — `paymentService.createPayment`, restricted at
> the route (not the service) to `vodafone_cash`/`bank_transfer` so
> `card`/`fawry` (online, TASK-1105, Not Started) return `400` rather
> than silently creating a payment with no gateway session behind it;
> lifting that restriction is a one-line change once TASK-1105 lands.
> `GET /api/payments` (own history, optional `?status=`) and
> `GET /api/payments/[paymentId]` (single payment, via the already
> ownership-gated `paymentService.getPayment`) let a student check a
> submitted payment's status after the fact. No enroll/checkout UI was
> added — there's no page to launch it from yet (`(public)` course
> listing/detail is Phase 14, Not Started; `student/dashboard` only
> lists *existing* enrollments, TASK-1103), so wiring `POST /api/payments`
> into a form is deferred to whichever of those lands first, same as
> TASK-1104 deferred its own routes to this task.
>
> Unit tests in `app/api/payments/route.test.ts` and
> `app/api/payments/[paymentId]/route.test.ts` (mocked
> `requireSession`/`paymentService`, same pattern as
> `app/api/enrollments/route.test.ts`) — could not actually run
> `npx vitest`/`npx tsc` here (npm registry unreachable in this sandbox,
> `npm install` fails on a 403 fetching a transitive dependency); written
> to the same shape as the already-passing TASK-1102 tests, review
> before trusting. No i18n/RTL/theme surface — API routes only, no new
> client-visible strings.
