# Ownership Model (Single Teacher)

> Note: this project was originally scoped as a multi-tenant platform
> (one workspace per teacher). It has been re-scoped as a **private
> system for a single teacher**. There is no tenant concept and no
> cross-teacher isolation requirement — this doc replaces the old
> "Multi-Tenant Architecture" doc.

## Owner model

The whole system belongs to one teacher (the owner). The owner's
Firebase Auth `uid` is still stored as `teacherId` on owned documents,
but only as a simple ownership/audit field, not as a security
boundary between multiple teachers — there is only one.

```text
teacherId = Firebase Auth uid of the single owner
```

## Rule: teacher-owned documents still carry `teacherId`

Collections such as `courses`, `lessons`, `students` link records,
`enrollments`, `quizzes`, `questions`, `files`, and `teacherSettings`
keep a top-level `teacherId` field, set once at creation. This is kept
for consistency, auditing, and to avoid a larger rewrite of the data
model — not because multiple teachers share the system.

## Enforcement layers

1. **Firestore Security Rules** — restrict all data access to the
   single authenticated owner account (`request.auth.uid ==
   OWNER_UID` or equivalently `resource.data.teacherId ==
   request.auth.uid`, since there is only one teacher).
2. **Service layer** — services still take the verified session's
   `teacherId`/uid, mainly to keep the code shape stable and make a
   future multi-teacher expansion easier, not because isolation
   between teachers is currently a requirement.
3. **Repository layer** — unchanged shape; queries can still be
   scoped by `teacherId`, but there is no "other tenant" to guard
   against.

## Access patterns

- **Students** may read course/lesson content only for courses they
  are enrolled in (checked via the `enrollments` collection).
- **Public pages** (`/teachers/[slug]`, `/courses/[slug]`) expose a
  deliberately limited, public subset of the teacher's data
  (published courses only).

## Adding a new collection (checklist)

1. Add `teacherId: string` to the document shape (ownership/audit).
2. Add Security Rules requiring `request.auth.uid == OWNER_UID`.
3. Add repository methods.
4. Add a Firestore composite index if needed.
5. Document the collection in `database/collections.md`.
