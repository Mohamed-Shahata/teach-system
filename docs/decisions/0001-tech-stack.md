# ADR 0001: Technology Stack

## Status
Accepted

## Context
Need a stack that supports a bilingual, private educational platform,
deployable on Vercel, buildable quickly by a solo/small team without
managing custom backend infrastructure.

## Decision
Next.js (App Router) + TypeScript + Tailwind CSS on the frontend;
Firebase (Auth + Firestore + Security Rules + Admin SDK) as the backend;
Cloudinary for media; Vercel for deployment.

## Consequences
- No custom server/infrastructure to manage; fast iteration.
- Firestore's document model requires denormalization (e.g. `teacherId`
  copied onto owned documents) for query efficiency and rule enforcement
  — accepted tradeoff, documented per-collection in `database/collections.md`.
- Admin SDK usage must remain serverless-safe (see `deployment/vercel.md`).
