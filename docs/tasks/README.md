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
| 20 | Automated Class Notifications | Done |
| 21 | Stage-Wide Exams & Manual Grading | Not Started |
| 22 | Lesson Video Upload Widget | Not Started |
| 23 | "My Teachers" (Student-Facing) | Not Started |
| 24 | Admin Oversight Enhancements | Not Started |
| 25 | Lesson Watch-Progress Tracking | Not Started |
| 26 | Real Push Notifications (FCM / Web Push) | Not Started |
| 27 | Student Reviews & Ratings for Teachers | Not Started |
| 28 | Exam Results Export (PDF / Excel) | Not Started |
| 15 | Security | Not Started |
| 16 | Testing | Not Started |
| 17 | Deployment | Not Started |
| 18 | MVP Finalization | Not Started |

> Phases 20–24 were added after the initial 18-phase roadmap + Phase 19,
> at the user's request (post-MVP feature batch). They build on already-
> shipped foundations (Phase 6's notifications, Phase 12's quizzes, the
> Cloudinary upload pipeline, Phase 10/11's student-teacher relationship
> data, and Phase 19's admin dashboard) rather than introducing new core
> collections where an existing one already fits — see each phase file's
> intro note for exactly what it reuses. Phases 25–28 are a second
> post-MVP batch (Claude's own suggestions, accepted by the user) added
> the same way. No fixed ordering was requested within either batch —
> pick whichever unblocks the next thing you want to ship.

> Reordered: Phase 19 (Admin Dashboard) was pulled ahead of Phase 15
> (Security) at the user's request. Phases 20–28 (both post-MVP
> feature batches) were likewise placed ahead of Security/Testing/
> Deployment/MVP Finalization (15–18) — those four now close out the
> roadmap instead of sitting in the middle, per the user's request, since
> none of the new feature phases has a hard dependency on them. File
> names and TASK-ID numbering were left as originally assigned (e.g.
> `phase-15-security.md` still contains "Phase 15" and `TASK-15xx`) to
> avoid an invasive rename across cross-referenced docs — this table's
> row order is the actual intended working order, not the file numbers.

Before starting any task, follow `development/ai-agent-workflow.md`.
