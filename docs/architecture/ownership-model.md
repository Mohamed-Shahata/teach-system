# Ownership Model (Single Center — Admin + Multiple Teachers)

> Note: this project was originally scoped as multi-tenant (one workspace
> per teacher), then re-scoped as a private single-teacher system. It is
> now re-scoped a second time: a **single center**, owned by one Admin,
> with **multiple teachers** and **multiple students** sharing one
> database. This doc replaces the old "Multi-Tenant Architecture" /
> "Single Teacher" doc.

## Owner model

The whole system belongs to one center, represented by a single **Admin**
account. Under that Admin there can be any number of **Teacher** accounts
(one per subject/specialty — Physics, Math, Arabic, ...) and any number
of **Student** accounts. There is still no cross-center isolation
requirement (there is only one center), but — unlike the single-teacher
version — there **is** isolation required *between teachers*: a teacher
must not see or modify another teacher's courses, schedule, students'
grades, etc., unless that student is enrolled with them.

```text
Admin    (1)  — full access to everything in the center
Teacher  (N)  — owns their own subject(s): courses, schedule, exams, files
Student  (N)  — owns their own enrollments/progress
```

`teacherId` on a document still means "which teacher owns/created this",
but it is now a **real access-control boundary** between teachers, not
just an audit field.

## Roles recap

See `authorization/README.md` for the full permission matrix. Summary:

- **Admin**: creates Teacher and Student accounts, sees/manages
  everything (all teachers, all students, all courses, all payments).
- **Teacher**: creates Student accounts, manages their own courses,
  lessons, weekly schedule, exams/quizzes, and files. Cannot see or edit
  another teacher's data.
- **Student**: views/enrolls in courses, watches lessons they're enrolled
  in, takes exams, sees their own schedule and progress.

## No public self-registration

There is **no open sign-up page**. Every account (`teacher` or
`student`) is created by an Admin, or — for students only — by a
Teacher. See `authentication/README.md` for the account-creation flow.

## Enforcement layers

1. **Firestore Security Rules** — restrict data access based on the
   authenticated user's `role` and, for teacher-owned collections,
   `resource.data.teacherId == request.auth.uid` (or `role == "admin"`).
2. **Service layer** — every service that touches a teacher-owned
   collection resolves the acting user's `role`/`uid` from the verified
   session and enforces ownership (`assertTeacherOwnsResource`) unless
   the acting user is an Admin.
3. **Repository layer** — unchanged shape; queries are scoped by
   `teacherId` for teacher-owned collections.

## Access patterns

- **Teachers** can only read/write their own courses, lessons, schedule
  entries, quizzes, questions, and files. They can read (not write)
  their own students' enrollment/progress.
- **Students** may read course/lesson content only for courses they are
  enrolled in (checked via the `enrollments` collection), and can only
  ever see their **own** enrollments/progress/quiz attempts/schedule.
- **Admin** bypasses teacher-ownership checks everywhere (still subject
  to student-privacy checks — an Admin manages accounts and payments, not
  a reason to casually expose one student's data through unrelated UI).
- **Public pages** (`/teachers/[slug]`, `/courses/[slug]`) expose a
  deliberately limited, public subset of a teacher's data (published,
  paid-visible courses only) — same as before.

## Adding a new collection (checklist)

1. Add `teacherId: string` to the document shape (real ownership now,
   not just audit).
2. Add Security Rules: `role == "admin" || resource.data.teacherId ==
   request.auth.uid` (adjust per read/write needs, e.g. enrolled student
   read access).
3. Add repository methods, always scoped by `teacherId` unless the
   caller is confirmed Admin.
4. Add a Firestore composite index if needed.
5. Document the collection in `database/collections.md`.
