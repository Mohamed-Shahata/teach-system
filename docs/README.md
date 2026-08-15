# Teacher SaaS Platform — Documentation

This is the single source of truth for the architecture, data model, and
development plan of the platform. It is written **before** implementation,
per the project's AI Agent Rules (see `development/ai-agent-workflow.md`).

## Product Summary

A multi-tenant educational SaaS. Each **teacher** is a tenant with an
isolated workspace: courses, lessons, students, enrollments, quizzes,
files, and a public profile page. Built with Next.js (App Router) +
Firebase + Cloudinary, deployed on Vercel, fully bilingual (English/Arabic,
LTR/RTL), with light/dark themes.

## How to navigate this documentation

| Folder | Contents |
|---|---|
| `architecture/` | System, frontend, and multi-tenant architecture, data flow, error handling |
| `database/` | Firestore collections, fields, relationships, indexes |
| `authentication/` | Firebase Auth flows, session handling, protected routes |
| `authorization/` | Roles, permissions, tenant ownership enforcement |
| `firebase/` | Firebase project setup, Security Rules, Admin SDK usage |
| `cloudinary/` | Upload strategy, signed uploads, folder structure |
| `internationalization/` | i18n architecture, translation files, RTL/LTR |
| `design-system/` | Color tokens, typography, components, themes |
| `features/` | Per-feature specs (courses, lessons, students, enrollment, quizzes, files, public pages) |
| `api/` | Server route conventions and endpoints |
| `components/` | Shared UI component catalogue |
| `security/` | Threat model, tenant isolation rules, validation strategy |
| `deployment/` | Vercel deployment, environment variables |
| `development/` | Coding rules, workflow, AI agent rules |
| `decisions/` | Architecture Decision Records (ADRs) |
| `tasks/` | Phase-by-phase task breakdown (Phase 1 → Phase 18) |

## Status

Documentation & planning phase (Phase 1 in `tasks/`). No feature code has
been implemented yet — implementation proceeds task-by-task per
`tasks/README.md`.
