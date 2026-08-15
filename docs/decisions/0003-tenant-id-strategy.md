# ADR 0003: teacherId as Owner Identifier (Superseded multi-tenant framing)

## Status
Accepted (re-scoped: single teacher, not a multi-teacher platform)

## Context
Originally written for a platform where each teacher had their own
tenant/workspace. The project has since been re-scoped as a private system for
a single teacher, so there is no tenant concept to strategize about —
but the `teacherId` field convention is kept.

## Decision
Keep the owner's Firebase Auth `uid` stored as `teacherId` on owned
documents, as a simple ownership/audit field, rather than reworking
the data model now that multi-tenancy isn't a requirement.

## Consequences
- Simpler system: no "tenant"/"organization" concept at all.
- `teacherId` still marks who owns a resource, useful for audit logs
  and for keeping repository/service code shapes unchanged.
- If this ever needs to support more than one teacher in the future,
  the existing `teacherId` field can be reused as-is.
