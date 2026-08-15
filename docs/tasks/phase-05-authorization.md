# Phase 5 — Authorization

## TASK-501: Role & guard utilities
- Description: Implement `lib/auth/guards.ts` (`assertRole`, `assertTeacherOwnsCourse`, `assertStudentEnrolled`, ...) per `authorization/README.md`.
- Dependencies: TASK-406
- Status: Done

> Note: widened `UserRole` (`lib/validation/auth.schema.ts`) to
> `"admin" | "teacher" | "student"` per `docs/database/collections.md`
> (previously `"teacher" | "student"` only, which was really the
> *registration-intent* subset). Added `registrationRoleSchema` for that
> narrower registration-only set and repointed `registerSchema` /
> `registerFormSchema` at it — `POST /api/auth/register` still can't be
> used to self-provision an admin account. `assertTeacherOwnsCourse` is
> kept as a named alias of the more general `assertTeacherOwnsResource`
> (matches the docs' example name; the same owner-or-admin check applies
> to lessons/quizzes/files, not just courses, once those collections
> exist). `Course`/`Enrollment` domain types don't exist yet (Phase 6/8/11
> not started), so the guards take minimal structural types
> (`OwnedByTeacher`, `EnrollmentLike`) instead of importing future models.

## TASK-502: Route-group role gating
- Description: Extend middleware to redirect users whose role doesn't match `(protected)/teacher|student|admin/*`.
- Dependencies: TASK-501
- Status: Done

> Note: a signed-in user hitting a protected area for a different role
> (e.g. a student on `/teacher/...`) is redirected to their own area
> (`/${locale}/${session.role}`) rather than to `/login`, since they are
> authenticated — only role, not auth state, is wrong. Unauthenticated
> visitors still redirect to login as before (unchanged from TASK-406).
> Covered in `proxy.test.ts`.

## TASK-503: Permission matrix test suite
- Description: Automated tests asserting the full permission matrix in `authorization/README.md` for each role/resource combination.
- Dependencies: TASK-501
- Testing requirements: this task IS a test suite
- Status: Done

> Note: `lib/auth/guards.test.ts` — 17 tests covering every guard
> (`assertRole`, `assertTeacherOwnsResource`, `assertStudentEnrolled`,
> `assertCanViewEnrollment`) across admin/teacher/student ×
> own-resource/other's-resource/enrolled/not-enrolled/cancelled
> combinations, mirroring each row of the permission matrix. Route-group
> role gating (the middleware layer) is covered separately in
> `proxy.test.ts`.
