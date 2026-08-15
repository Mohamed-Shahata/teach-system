# Phase 1 — Project Foundation

## TASK-101: Establish documentation & planning structure
- Description: Create the full `/docs` tree (this documentation).
- Goal: A documented architecture and task plan exists before any feature code.
- Dependencies: none
- Affected modules: `/docs`
- Acceptance criteria: all sections listed in `docs/README.md` exist with real content (not placeholders).
- Testing requirements: n/a (documentation)
- Documentation requirements: this task's output *is* the documentation
- Status: Done

## TASK-102: Base folder structure & tooling
- Description: Set up `app/[locale]`, `components/ui`, `lib/server/{repositories,services}`, `lib/validation`, `lib/auth`, per `architecture/folder-structure.md`. Configure path aliases (`@/*`).
- Goal: Empty but correctly structured skeleton matching the documented architecture.
- Dependencies: TASK-101
- Affected modules: root config, `tsconfig.json`
- Acceptance criteria: folders exist; `tsc --noEmit` passes on the empty skeleton; ESLint configured.
- Testing requirements: build passes (`next build`)
- Documentation requirements: none beyond `folder-structure.md`
- Status: Not Started

## TASK-103: Environment variable scaffolding
- Description: Create `.env.example` with all variables from `deployment/environment-variables.md`.
- Goal: Clear, documented env var contract before any Firebase/Cloudinary code is written.
- Dependencies: TASK-101
- Affected modules: root
- Acceptance criteria: `.env.example` matches the documented table exactly; no real secrets committed.
- Testing requirements: n/a
- Documentation requirements: keep in sync with `deployment/environment-variables.md`
- Status: Not Started

## TASK-104: Firebase & Cloudinary project setup
- Description: Create Firebase project(s) (dev/staging/prod), enable Auth + Firestore, create Cloudinary account/folders per `cloudinary/README.md`.
- Goal: Working external service accounts ready to connect.
- Dependencies: TASK-103
- Affected modules: infrastructure (no code)
- Acceptance criteria: projects exist; credentials retrieved and stored in Vercel env vars (not committed).
- Testing requirements: n/a
- Documentation requirements: record project IDs/naming in `firebase/README.md` if they diverge from the convention
- Status: Not Started
