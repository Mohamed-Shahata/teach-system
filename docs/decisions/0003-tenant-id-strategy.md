# ADR 0003: teacherId as Tenant Identifier

## Status
Accepted

## Context
Need a tenant identifier strategy for a multi-tenant SaaS where, in the
MVP, a tenant is always exactly one teacher.

## Decision
Use the teacher's Firebase Auth `uid` directly as `teacherId` on every
tenant-owned document, rather than introducing a separate `tenantId`
concept up front.

## Consequences
- Simpler MVP: no extra indirection/collection for "organizations".
- Future-proofed: if institutions/multi-teacher organizations are added,
  a `tenantId` field can be introduced alongside `teacherId` (an
  organization owning many teachers) without migrating existing
  `teacherId`-scoped documents or rules — `teacherId` keeps meaning "who
  created/owns this specific resource" even inside an org.
