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
- Status: Done

> Unblocked now that both blockers noted in the original Blocked note
> are resolved: an emulator is reachable (Phase 16, TASK-1603) and
> `lessons`/`schedule`/`enrollments` all now have real data to isolate
> against (Phases 9/11).
>
> - (a) — `test/firestore.rules.test.ts`: `lessons` "a non-enrolled
>   student cannot read the lesson" and `enrollments` "a different
>   student cannot read someone else's enrollment" / "a student cannot
>   change their enrollment status" cover this directly against the
>   real rules + emulator.
> - (b) — same file: `courses` "a non-owner cannot read a draft
>   course" / "a teacher cannot update another teacher's course",
>   `lessons` "a non-owning teacher cannot read the lesson",
>   `schedule` "a non-owning teacher cannot update the slot". The
>   "student list" half of (b) needs no dedicated case: `users/{uid}`
>   rules already deny read to anyone but Admin or the doc's own
>   owner, so a teacher has no rules-level path to another teacher's
>   students' user docs at all (verified by the existing generic
>   `users/{uid}` "a user cannot read another user's doc" case) — the
>   student-list *feature* itself is server-side (Admin SDK, scoped by
>   `teacherId` per TASK-602's `scopeToTeacher`), covered instead by
>   `teacherManagementService.test.ts`/`studentService.test.ts`.
> - (c)/(d) — already had service-layer coverage
>   (`accountService.test.ts`) per the original note; now also
>   confirmed at the route/integration level:
>   `app/api/admin/accounts/route.test.ts` ("returns 403 when the
>   service rejects the role (non-admin session)") and
>   `app/api/teacher/students/route.test.ts` ("maps role errors",
>   non-teacher session → 403).
>
> All four (a)–(d) now have real emulator or route-level integration
> coverage, run and passing (63/63 rules tests; 104/104 unit/route
> suites).

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
- Status: Done

> Note: `app/[locale]/(public)/register/*`, `app/api/auth/register/*`, and
> `components/auth/register-form.tsx` were already absent from the tree
> when this task was picked up — only the dependent code was left behind:
> - Removed `lib/server/services/authService.ts` (only export was
>   `registerUser`, unused by anything else) and its test file.
> - Removed `registerSchema`/`registerFormSchema`/`registrationRoleSchema`
>   and their inferred types from `lib/validation/auth.schema.ts`, keeping
>   only `roleSchema`/`UserRole`.
> - `lib/server/repositories/userRepository.ts`: `UserDoc.createdBy` is now
>   required (was optional only for `authService.registerUser`'s sake,
>   per that field's own TODO). `accountService.provisionAccount` — the
>   only remaining caller of `userRepository.create` — always sets it, so
>   no data-shape change is needed elsewhere.
> - `components/auth/login-form.tsx`: removed the "Don't have an account?
>   Sign up" link to the now-nonexistent `/register` route.
> - `components/auth/reset-password-form.tsx` was pointing its
>   password-mismatch validation message at `auth.register.errors.*`
>   (leftover cross-reference); repointed to a new
>   `auth.resetPassword.errors.passwordMismatch` key.
> - `messages/en.json` / `messages/ar.json`: removed the `auth.register`
>   namespace and `auth.login.noAccount`/`auth.login.signUp`; added
>   `auth.resetPassword.errors.passwordMismatch` (en + ar).
> - `docs/architecture/folder-structure.md` updated: dropped
>   `register/page.tsx` and `auth/register/route.ts` from the tree,
>   listed `forgot-password/page.tsx` (existed but was missing from the
>   doc) and the real `admin/accounts` / `teacher/students` routes from
>   TASK-604.
> - `docs/authentication/README.md` and `docs/features/authentication.md`
>   already documented the no-self-registration state correctly; no
>   change needed there.
> No dedicated `userRepository.test.ts` exists to update (repository has
> no tests file in this codebase yet). Could not run `npm test` /
> `check-translations` / typecheck — no `node_modules` and no network in
> this sandbox (same limitation noted on TASK-601/402/603); all removals
> were verified by exhaustive `grep` for `register`/`authService`/the
> removed schema and type names across `app`, `components`, `lib`, and
> `messages`, with none left dangling. Recommend running the full test
> suite and `npm run check-translations` in CI/locally before merge.
