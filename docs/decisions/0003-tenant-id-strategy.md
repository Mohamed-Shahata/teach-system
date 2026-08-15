# ADR 0003: teacherId as Ownership Boundary (Re-scoped: Center, Admin + Multiple Teachers)

## Status
Accepted (re-scoped a second time: single center, one Admin, multiple
teachers and students — not a single-teacher platform, not a
multi-tenant/multi-center SaaS product)

## Context
Originally written for a platform where each teacher had their own
tenant/workspace (multi-tenant SaaS). It was then re-scoped as a private
system for a single teacher, where `teacherId` was kept only as an
audit field. The project has since been re-scoped again: it's a single
**center**, run by one Admin, with **multiple teachers** covering
different subjects/stages and many students — still one shared
database (not SaaS, not per-teacher isolated workspaces), but teachers
*do* need to be isolated from each other's data.

## Decision
Keep `teacherId` on owned documents (`courses`, `lessons`, `schedule`
entries, `quizzes`, `questions`, `files`), but treat it as a **real
access-control boundary between teachers** — enforced in Security
Rules and the service layer — rather than a plain audit field. The
Admin account bypasses this boundary (`role == "admin"`).

## Consequences
- The system supports many teachers under one Admin, without becoming
  multi-tenant SaaS: there is still only one Firestore project/database,
  one login page, and no per-teacher subdomain/workspace concept.
- `teacherId` checks that were previously "kept for consistency" in the
  single-teacher doc become load-bearing again: every service method and
  Security Rule touching a teacher-owned collection must check it.
- `role == "admin"` is the one deliberate bypass of the `teacherId`
  check, and must be verified server-side from the session, never from
  client input.
