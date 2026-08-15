# Phase 15 — Security

## TASK-1501: Full Firestore Security Rules coverage
- Description: Extend `firestore.rules` to cover every collection in `database/collections.md` (lessons, enrollments, quizzes, questions, quizAttempts, files).
- Dependencies: all data-model phases (8–13)
- Status: Not Started

## TASK-1502: Env-exposure guard script
- Description: `scripts/check-env-exposure.ts` fails CI if a non-`NEXT_PUBLIC_` var is referenced from client-bundled code.
- Dependencies: TASK-103
- Status: Not Started

## TASK-1503: Security review pass
- Description: Manual pass through `security/README.md` threat model against the implemented app; document findings/fixes in `decisions/` if architectural changes result.
- Dependencies: all feature phases
- Status: Not Started
