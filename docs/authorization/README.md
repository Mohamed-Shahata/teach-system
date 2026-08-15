# Authorization Architecture

## Roles (MVP)

```text
admin
teacher
student
```

Stored on `users/{uid}.role`, set only by server-side code. The
authorization module is designed so that adding a role (e.g.
`institutionAdmin`) later means adding a value to the role union and new
guard functions — not rewriting existing guards.

## Guard layers

1. **Middleware** — coarse-grained: is the user authenticated, and does
   their role match the route group they are entering
   (`(protected)/teacher/*`, `(protected)/student/*`, `(protected)/admin/*`)?
2. **Service layer guards** — fine-grained: does this specific teacher own
   this specific course/lesson/file? Is this student actually enrolled in
   this course? Implemented as small composable functions, e.g.:

```ts
// lib/auth/guards.ts
export function assertTeacherOwnsCourse(course: Course, teacherId: string): void
export function assertStudentEnrolled(enrollment: Enrollment | null): void
export function assertRole(user: SessionUser, role: Role): void
```

3. **Firestore Security Rules** — the non-negotiable last line of defense,
   duplicating the ownership checks independently of application code (see
   `firebase/security-rules.md`).

## Permission matrix (MVP)

| Action | Admin | Teacher (own resource) | Teacher (other's resource) | Student (enrolled) | Student (not enrolled) |
|---|---|---|---|---|---|
| Create/edit/delete course | ✅ | ✅ | ❌ | ❌ | ❌ |
| View course content | ✅ | ✅ | ❌ (unless published) | ✅ | ❌ |
| Manage lessons | ✅ | ✅ | ❌ | ❌ | ❌ |
| View own enrollment/progress | ✅ | ✅ (as owner, read-only aggregate) | ❌ | ✅ (own only) | ❌ |
| Create/edit quiz | ✅ | ✅ | ❌ | ❌ | ❌ |
| Take quiz | ❌ | ❌ | ❌ | ✅ | ❌ |
| Upload file to a course | ✅ | ✅ | ❌ | ❌ | ❌ |
| View public teacher page | ✅ | ✅ | ✅ | ✅ | ✅ |

## Never trust client-supplied role/tenant data

Any request body field named `role`, `teacherId`, `isAdmin`, etc. is
ignored for authorization decisions; the server always derives these from
the verified session (see `authentication/README.md`) and, for
ownership, from the resource's own stored `teacherId`.
