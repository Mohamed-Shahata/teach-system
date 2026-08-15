# Phase 6 — Multi-Tenant Architecture

## TASK-601: Firestore Security Rules v1
- Description: Implement `firestore.rules` per `firebase/README.md`, covering `users`, `teacherProfiles`, `courses` initially (extended per later phases).
- Dependencies: TASK-401
- Testing requirements: Firebase emulator rules unit tests (allow/deny cases per role)
- Status: Not Started

## TASK-602: Repository layer scoping convention
- Description: Base repository helper enforcing `teacherId` filter on all list/get methods for tenant-owned collections; no unscoped query method exposed.
- Dependencies: TASK-401
- Affected modules: `lib/server/repositories/base.ts`
- Status: Not Started

## TASK-603: Tenant isolation test suite
- Description: Integration tests proving Teacher A cannot read/write Teacher B's courses/lessons/files via API, service, or rules layer.
- Dependencies: TASK-601, TASK-602
- Status: Not Started
