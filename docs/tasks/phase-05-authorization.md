# Phase 5 — Authorization

## TASK-501: Role & guard utilities
- Description: Implement `lib/auth/guards.ts` (`assertRole`, `assertTeacherOwnsCourse`, `assertStudentEnrolled`, ...) per `authorization/README.md`.
- Dependencies: TASK-406
- Status: Not Started

## TASK-502: Route-group role gating
- Description: Extend middleware to redirect users whose role doesn't match `(protected)/teacher|student|admin/*`.
- Dependencies: TASK-501
- Status: Not Started

## TASK-503: Permission matrix test suite
- Description: Automated tests asserting the full permission matrix in `authorization/README.md` for each role/resource combination.
- Dependencies: TASK-501
- Testing requirements: this task IS a test suite
- Status: Not Started
