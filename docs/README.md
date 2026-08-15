# Teacher's Private Platform — Documentation

This is the single source of truth for the architecture, data model, and
development plan of the platform. It is written **before** implementation,
per the project's AI Agent Rules (see `development/ai-agent-workflow.md`).

## Product Summary

A private educational-center platform (not a multi-tenant SaaS product):
one Admin runs the center and can add multiple Teachers (each covering
one or more subjects, from nursery through Grade 3 Secondary) and
Students. There is a single shared login page — accounts are created
only by the Admin (teacher or student) or by a Teacher (student only),
never via public sign-up. It covers courses (paid, recorded-video
lessons), a per-teacher weekly class schedule, students, enrollments
gated by payment (online or manual), quizzes/exams, files, and public
profile/course pages. Built with Next.js (App Router) + Firebase +
Cloudinary, deployed on Vercel, fully bilingual (English/Arabic,
LTR/RTL), with light/dark themes.

## How to navigate this documentation

| Folder | Contents |
|---|---|
| `architecture/` | System, frontend, and ownership-model (Admin + multi-teacher) architecture, data flow, error handling |
| `database/` | Firestore collections, fields, relationships, indexes |
| `authentication/` | Firebase Auth flows, session handling, protected routes |
| `authorization/` | Roles, permissions, owner-only access enforcement |
| `firebase/` | Firebase project setup, Security Rules, Admin SDK usage |
| `cloudinary/` | Upload strategy, signed uploads, folder structure |
| `internationalization/` | i18n architecture, translation files, RTL/LTR |
| `design-system/` | Color tokens, typography, components, themes |
| `features/` | Per-feature specs (courses, lessons, students, enrollment, quizzes, files, public pages) |
| `api/` | Server route conventions and endpoints |
| `components/` | Shared UI component catalogue |
| `security/` | Threat model, owner-only access control rules, validation strategy |
| `deployment/` | Vercel deployment, environment variables |
| `development/` | Coding rules, workflow, AI agent rules |
| `decisions/` | Architecture Decision Records (ADRs) |
| `tasks/` | Phase-by-phase task breakdown (Phase 1 → Phase 18) |

## Status

Phases 1–2 (Foundation, Design System) are done. Implementation proceeds
task-by-task per `tasks/README.md`; Phase 3 (Internationalization) is
next.
