# Task Breakdown

Work proceeds task-by-task per phase, in dependency order. Each phase has
its own file (`phase-01-foundation.md` ... `phase-18-mvp-finalization.md`)
with tasks in this shape:

```text
Task ID
Title
Description
Goal
Dependencies
Affected modules
Acceptance criteria
Testing requirements
Documentation requirements
Status: Not Started | In Progress | Blocked | Done
```

## Phases

| Phase | Name | Status |
|---|---|---|
| 1 | Project Foundation | Done |
| 2 | Design System | Done |
| 3 | Internationalization | Done |
| 4 | Authentication | Done |
| 5 | Authorization | Done |
| 6 | Ownership & Access Rules (Center: Admin + Teachers) | In Progress |
| 7 | Teacher Dashboard | Done |
| 8 | Course Management | Done |
| 9 | Lesson Management | Done |
| 10 | Student Management | Done |
| 11 | Enrollment | In Progress |
| 12 | Quiz / Exam System | Done |
| 13 | File Management | Done |
| 14 | Public Pages | Done |
| 19 | Admin Dashboard & System Analytics | In Progress |
| 15 | Security | Not Started |
| 16 | Testing | Not Started |
| 17 | Deployment | Not Started |
| 18 | MVP Finalization | Not Started |

> Reordered: Phase 19 (Admin Dashboard) was pulled ahead of Phase 15
> (Security) at the user's request. It has no hard dependency on the
> phases after it, so this is safe; Security still lands before Testing
> and Deployment as originally planned.

Before starting any task, follow `development/ai-agent-workflow.md`.
