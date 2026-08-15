# Phase 6 — Ownership & Access Rules (Single Teacher)

> Originally "Multi-Tenant Architecture" for a platform serving multiple
> teachers. The project is now a private single-teacher system, so tasks
> about cross-tenant isolation between teachers no longer apply. Kept as
> access-control tasks for the one owner account vs. students.

## TASK-601: Firestore Security Rules v1
- Description: Implement `firestore.rules` per `firebase/README.md`, covering `users`, `teacherProfiles`, `courses` initially (extended per later phases). Rules restrict write access to the single owner account.
- Dependencies: TASK-401
- Testing requirements: Firebase emulator rules unit tests (allow/deny cases per role)
- Status: Not Started

## TASK-602: Repository layer scoping convention
- Description: Base repository helper keeping `teacherId` as an ownership/audit field on owner-owned collections (kept for data-shape consistency, not for isolating multiple teachers).
- Dependencies: TASK-401
- Affected modules: `lib/server/repositories/base.ts`
- Status: Not Started

## TASK-603: Access-control test suite
- Description: Integration tests proving students cannot read/write data outside their own enrollments, and non-owner accounts cannot access owner-only data, via API, service, or rules layer.
- Dependencies: TASK-601, TASK-602
- Status: Not Started
