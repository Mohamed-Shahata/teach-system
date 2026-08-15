# Phase 6 — Ownership & Access Rules (Center: Admin + Multiple Teachers)

> Originally "Multi-Tenant Architecture", then narrowed to a single
> teacher, this phase is now re-scoped again: **one center, one Admin,
> multiple teachers, multiple students**. Teacher-to-teacher isolation
> is a real requirement again (see `architecture/ownership-model.md`).

## TASK-601: Firestore Security Rules v1
- Description: Implement `firestore.rules` per `firebase/README.md`, covering `users`, `teacherProfiles`, `educationStages`, `subjects`, `courses`. Rules: Admin has full access; a Teacher may read/write only documents where `teacherId == request.auth.uid`; a Student may only read published/enrolled content and their own `users` doc.
- Dependencies: TASK-401
- Testing requirements: Firebase emulator rules unit tests (allow/deny cases per role, including teacher-vs-other-teacher denial)
- Status: Done

> Note: `firestore.rules` + `firebase.json` + `firestore.indexes.json`
> added at the project root. Emulator-based rules unit tests from the
> original testing requirements have not been added — no `firebase-tools`
> devDependency and no emulator available in this sandbox (same
> limitation noted on TASK-402). Recommend adding
> `@firebase/rules-unit-testing` + emulator rules tests under Phase 16
> (Testing) or before TASK-603, whichever comes first. Rules cover only
> the five collections in scope for this task; lessons/schedule/
> enrollments/quizzes/questions/quizAttempts/files/payments rules are
> added in their own phases, following the same `isOwner(teacherId)`
> pattern already established here.

## TASK-602: Repository layer scoping convention
- Description: Base repository helper that enforces `teacherId` scoping on every query/write for teacher-owned collections, with an explicit Admin bypass. Not just a convention now — this is the actual isolation mechanism between teachers.
- Dependencies: TASK-401
- Affected modules: `lib/server/repositories/base.ts`
- Status: Done

> Note: `lib/server/repositories/base.ts` adds `scopeToTeacher` (read
> queries), `assertWritableByTeacher` (write guard, defense-in-depth
> alongside the service-layer guard), and `resolveOwnerTeacherId`
> (resolves the `teacherId` a new document should be created with — a
> teacher's own uid, or an Admin-supplied uid). Unit tests in
> `base.test.ts` (mocked query objects, no real Firestore needed). Not
> yet wired into `courseRepository`/etc. since those repositories don't
> exist yet (Phase 8+) — this task only lands the shared helper.

## TASK-603: Access-control test suite
- Description: Integration tests proving: (a) students cannot read/write data outside their own enrollments; (b) a teacher cannot read/write another teacher's courses/lessons/schedule/students; (c) only Admin can create teacher accounts; (d) a teacher can create student accounts but not teacher/admin accounts.
- Dependencies: TASK-601, TASK-602
- Status: Blocked

> Note: revisited at its turn in the queue (dependencies 601/602 are
> Done) and found genuinely blocked on two independent things, so it's
> left Blocked rather than attempted partially:
> (1) (a)/(b) need real Firestore Security Rules integration tests
> (`@firebase/rules-unit-testing` + emulator) — same tooling gap flagged
> on TASK-601 (no `firebase-tools` devDependency, no emulator reachable,
> no network in this sandbox) — and (b) additionally needs a
> teacher-owned collection with actual data to isolate (`lessons`,
> `schedule` don't exist until Phase 9), so full coverage isn't buildable
> yet even with an emulator.
> (2) (c)/(d) are role-gating behavior of the account-creation endpoints,
> which didn't exist until TASK-604 (implemented next, out of order, for
> exactly this reason). `(c)`/`(d)`'s *service-layer* behavior now has
> direct unit-test coverage in `lib/server/services/accountService.test.ts`
> (`createAccountByAdmin` rejects non-admin, `createStudentByTeacher`
> rejects non-teacher) — that's real signal, just not the "integration
> test" this task asks for.
> Recommend unblocking in two steps: add emulator + rules-unit-testing
> under Phase 16 (Testing), then write the full (a)–(d) integration
> suite once `lessons`/`schedule` (Phase 9) and enrollments (Phase 11)
> exist to isolate against.

## TASK-604: Account creation endpoints (Admin & Teacher)
- Description: `POST /api/admin/accounts` (Admin creates teacher or student), `POST /api/teacher/students` (Teacher creates a student, optionally pre-enrolling them in one of their own courses). Both create the Firebase Auth user via Admin SDK + `users/{uid}` (+ `teacherProfiles/{uid}` for teachers) — no client-facing open registration.
- Dependencies: TASK-401, TASK-602
- Affected modules: `app/api/admin/accounts/route.ts`, `app/api/teacher/students/route.ts`, `lib/server/services/accountService.ts`
- Status: Done

> Note: implemented ahead of TASK-603 in the queue — see the Blocked
> note on TASK-603 above for why. Credential delivery (previously an
> open question in `features/authentication.md`) is resolved by
> `decisions/0005-account-creation-credential-delivery.md`: the Auth
> account gets a random unused password, and the response carries a
> one-time password-reset link for the Admin/Teacher to relay directly.
> The "optionally pre-enrolling them in one of their own courses" part
> of the description is **not** implemented — per
> `features/enrollment.md` an enrollment is only ever created as a side
> effect of the payments flow (Phase 11, `TASK-1101`/`TASK-1104`, both
> Not Started), so there's nothing to wire it into yet. Revisit once
> Phase 11 lands. `userRepository.UserDoc.createdBy`/`stageId` were
> added as optional fields rather than required, since
> `authService.registerUser` (self-registration) doesn't set them and
> that code path is only removed in TASK-605, not this one — tighten to
> required once TASK-605 lands. Unit tests (no emulator/network in this
> sandbox, same limitation as TASK-601/TASK-402) in
> `lib/server/services/accountService.test.ts`,
> `app/api/admin/accounts/route.test.ts`,
> `app/api/teacher/students/route.test.ts`.

## TASK-605: Remove public self-registration
- Description: Delete the open sign-up page and route from Phase 4 (`app/[locale]/(public)/register/*`, `app/api/auth/register/*`, `components/auth/register-form.tsx`) and any registration-specific validation/tests, since account creation is now admin/teacher-only (TASK-604). Update `authService`/`userRepository` tests accordingly.
- Dependencies: TASK-604
- Status: Not Started
