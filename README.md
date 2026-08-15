# Teacher SaaS Platform

A multi-tenant educational SaaS. Each **teacher** is a tenant with an
isolated workspace: courses, lessons, students, enrollments, quizzes,
files, and a public profile page. Built with Next.js (App Router) +
Firebase + Cloudinary, deployed on Vercel, fully bilingual
(English/Arabic, LTR/RTL), with light/dark themes.

Full documentation lives in [`docs/`](./docs/README.md), starting with
the [task breakdown](./docs/tasks/README.md) and the
[AI agent workflow](./docs/development/ai-agent-workflow.md) that every
change follows.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real values, see docs/deployment/environment-variables.md
npm run dev
```
