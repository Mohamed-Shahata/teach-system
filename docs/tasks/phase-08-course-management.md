# Phase 8 — Course Management

## TASK-801: Course repository & service
- Description: `courseRepository` (Firestore CRUD scoped by `teacherId`), `courseService` (slug generation/uniqueness, publish/unpublish, stats counter updates).
- Dependencies: TASK-602
- Status: Not Started

## TASK-802: Course API routes
- Description: `/api/courses`, `/api/courses/[courseId]` per `api/README.md`.
- Dependencies: TASK-801, TASK-501
- Status: Not Started

## TASK-803: Course list & form UI
- Description: Teacher-facing course list, create/edit form (bilingual title/description, category, thumbnail upload), publish toggle.
- Dependencies: TASK-802, TASK-204
- Status: Not Started

## TASK-804: Course Security Rules
- Description: Extend `firestore.rules` for `courses` per `firebase/README.md`.
- Dependencies: TASK-601, TASK-801
- Status: Not Started
