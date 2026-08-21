# Center Platform (Admin + Multiple Teachers)

A private educational-**center** platform — **not** a multi-tenant SaaS
product. One Admin runs the center and creates Teacher and Student
accounts (no public sign-up); each Teacher manages their own subject(s),
paid recorded-video courses, weekly class schedule, students, exams, and
files, covering every stage from nursery to Grade 3 Secondary. Built
with Next.js (App Router) + Firebase + Cloudinary, deployed on Vercel,
fully bilingual (English/Arabic, LTR/RTL), with light/dark themes.

## Status

| Phase | Name | Status |
|---|---|---|
| 1 | Project Foundation | Done |
| 2 | Design System | Done |
| 3 | Internationalization | Done |
| 4 | Authentication | Done (self-registration part being replaced — see Phase 6) |
| 5 | Authorization | Not Started |
| 6 | Ownership & Access Rules (Center: Admin + Teachers) | In Progress |
| 7 | Teacher Dashboard | Not Started |
| 8 | Course Management | Not Started |
| 9 | Lesson Management | Not Started |
| 10 | Student Management | Not Started |
| 11 | Enrollment | Not Started |
| 12 | Quiz / Exam System | Not Started |
| 13 | File Management | Not Started |
| 14 | Public Pages | Not Started |
| 15 | Security | Not Started |
| 16 | Testing | Not Started |
| 17 | Deployment | Not Started |
| 18 | MVP Finalization | Not Started |

Full breakdown: [`tasks/README.md`](./tasks/README.md).

## Tech stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Firebase (Auth + Firestore + Security Rules + Admin SDK) — no custom server
- **Media**: Cloudinary
- **Deployment**: Vercel
- **i18n**: next-intl, English + Arabic, LTR/RTL
- **Testing**: Vitest

See [`docs/decisions/0001-tech-stack.md`](./docs/decisions/0001-tech-stack.md) for the reasoning.

## Project structure

```text
app/
  [locale]/            # locale-scoped routes (en/ar), layout, globals.css
    (public)/          # public pages (teacher profile, course pages)
    (protected)/       # owner-only pages (dashboard, courses, students...)
  api/                 # thin route handlers -> services
components/
  ui/                  # shared design-system primitives (button, input, table...)
  theme/                # theme provider + toggle (light/dark)
lib/
  server/
    repositories/       # only place allowed to call Firestore/Cloudinary SDKs
    services/            # business logic, orchestration, authorization checks
  validation/            # Zod schemas shared client + server
  auth/                  # session verification, route guards
  utils/                 # small shared helpers (e.g. cn())
docs/                    # full documentation — read before making changes
scripts/                 # dev tooling (e.g. contrast checker)
```

## Architecture at a glance

```text
Route Handler / Server Action
        ↓
   Service (business logic, authorization checks)
        ↓
  Repository (Firestore/Cloudinary I/O only)
        ↓
     Firebase / Cloudinary
```

- Server Components by default; Client Components only where
  interactivity is required.
- The whole system belongs to **one center**, run by one Admin, with
  many Teachers and Students. A `teacherId` field on owned documents is
  a real access boundary between teachers (not just audit), enforced in
  Firestore Security Rules and the service layer; the Admin bypasses it.
  Details: [`docs/architecture/ownership-model.md`](./docs/architecture/ownership-model.md).
- Students can only read course/lesson content for courses they're
  enrolled in; public pages expose a deliberately limited, published-only
  subset of data.

Full diagrams and data flow: [`docs/architecture/overview.md`](./docs/architecture/overview.md).

## Design system

- Color, typography, and theming tokens: [`docs/design-system/`](./docs/design-system/README.md)
- Shared UI primitives (Button, Input, Select, Checkbox, Radio, Switch,
  Dialog, Dropdown Menu, Tooltip, Card, Badge, Alert, Table, Pagination,
  Tabs, Breadcrumb, Skeleton, Empty/Loading/Error states) live in
  `components/ui/*` and are imported from the `components/ui` barrel
  export. Every primitive uses semantic color tokens (never hardcoded
  colors), supports both themes, and is RTL/LTR-aware via CSS logical
  properties (`ms-`/`me-`, `text-start`/`text-end`, `start-`/`end-`).
- Catalogue + checklist: [`docs/design-system/components.md`](./docs/design-system/components.md)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real values, see docs/deployment/environment-variables.md
npm run dev
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | Lint the codebase |
| `npm run check-contrast` | Verify color tokens meet WCAG AA contrast |
| `npm run check-translations` | Verify `messages/en.json` and `messages/ar.json` keys are in sync |
| `npm run check-rtl` | Flag physical (non-logical) RTL/LTR classes in `components/**` |
| `npm run test` | Run the Vitest test suite |

### Environment variables

See [`.env.example`](./.env.example) — Firebase client + Admin SDK
credentials, Cloudinary client + server credentials, and the session
cookie secret. Never commit real values; see
[`docs/deployment/`](./docs/deployment/vercel.md) for per-environment
project setup.

## Documentation

Full docs live in [`docs/`](./docs/README.md). Before making any
change, follow [`docs/development/ai-agent-workflow.md`](./docs/development/ai-agent-workflow.md) —
it walks through reading the relevant architecture, checking for
reusable code, checking security/i18n/RTL/theme implications, and
updating docs + task status after implementing.

Key sections:

| Folder | Contents |
|---|---|
| `architecture/` | System, frontend, and ownership-model (Admin + multi-teacher) architecture, data flow |
| `database/` | Firestore collections, fields, relationships, indexes |
| `authentication/` | Firebase Auth flows, session handling, protected routes |
| `authorization/` | Roles, permissions, owner-only access enforcement |
| `firebase/` | Firebase project setup, Security Rules, Admin SDK usage |
| `cloudinary/` | Upload strategy, signed uploads, folder structure |
| `internationalization/` | i18n architecture, translation files, RTL/LTR |
| `design-system/` | Color tokens, typography, components, themes |
| `features/` | Per-feature specs (courses, lessons, students, enrollment, quizzes, files, public pages) |
| `api/` | Server route conventions and endpoints |
| `components/` | Shared + feature-level UI component catalogue |
| `security/` | Threat model, owner-only access control rules, validation strategy |
| `deployment/` | Vercel deployment, environment variables |
| `development/` | Coding rules, workflow, AI agent rules |
| `decisions/` | Architecture Decision Records (ADRs) |
| `tasks/` | Phase-by-phase task breakdown (Phase 1 → Phase 18) |

## Internationalization

- `next-intl` with locale-prefixed routing (`/en/...`, `/ar/...`),
  wired via `proxy.ts`, `i18n/config.ts`, `i18n/request.ts`.
- Translations live in `messages/en.json` and `messages/ar.json`;
  `npm run check-translations` fails if keys diverge between them.
- `npm run check-rtl` flags physical Tailwind classes (`ml-`, `text-left`...)
  in `components/**` in favor of logical equivalents (`ms-`, `text-start`...).
- Language switcher: `components/layout/locale-switcher.tsx`.
- Full spec: [`docs/internationalization/README.md`](./docs/internationalization/README.md)

## Language & i18n

- UI supports English and Arabic with full LTR/RTL support.
- Fonts: Inter (English), IBM Plex Sans Arabic (Arabic), self-hosted via
  `@fontsource`.
- Source code (identifiers, comments) is English-only regardless of UI
  language — see `docs/development/language-rule.md`.
