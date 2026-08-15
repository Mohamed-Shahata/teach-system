# Multi-Tenant Architecture

## Tenant model

Each **teacher** is a tenant. The tenant identifier is the teacher's own
Firebase Auth `uid`, exposed in application code as `teacherId`.

```text
teacherId = Firebase Auth uid of the teacher user
```

We use `teacherId` rather than a separate `tenantId` because in this MVP
a tenant *is* a teacher 1:1. If institutions/organizations are introduced
later, a `tenantId` field can be added alongside `teacherId` without
breaking existing documents (see `decisions/0003-tenant-id-strategy.md`).

## Rule: every teacher-owned document carries `teacherId`

Collections owned by a tenant (`courses`, `lessons`, `students` link
records, `enrollments`, `quizzes`, `questions`, `files`, `teacherSettings`)
MUST include a top-level `teacherId` field, set once at creation and never
editable by the client.

## Enforcement layers (defense in depth)

1. **Firestore Security Rules** (`firebase/security-rules.md`) — the real
   boundary. Every read/write rule checks
   `resource.data.teacherId == request.auth.uid` (or, for creates,
   `request.resource.data.teacherId == request.auth.uid`).
2. **Service layer** — every service method that reads/writes a
   tenant-owned resource requires an explicit `teacherId` argument derived
   from the verified session, and repositories always filter/scope queries
   by it. Server code never trusts a `teacherId` coming from the request
   body.
3. **Repository layer** — query builders always require `teacherId` as a
   parameter for list/get operations on tenant-owned collections; there is
   no "get by id only" method exposed for these collections.

Frontend filtering is explicitly **not** considered a security boundary —
it only improves UX.

## Cross-tenant access patterns (explicitly allowed)

- **Students** may read course/lesson content only for courses they are
  enrolled in (checked via the `enrollments` collection, not by trusting a
  client flag).
- **Public pages** (`/teachers/[slug]`, `/courses/[slug]`) expose a
  deliberately limited, explicitly public subset of a teacher's data
  (published courses only), served via a dedicated public repository
  method that never returns unpublished or student data.

## Adding a new teacher-owned collection (checklist)

1. Add `teacherId: string` to the document shape.
2. Add Security Rules requiring `request.auth.uid == resource.data.teacherId`.
3. Add repository methods scoped by `teacherId`.
4. Add a Firestore composite index if querying by `teacherId` + another
   field.
5. Document the collection in `database/collections.md`.
