# Folder Structure

```text
app/
  [locale]/
    (public)/
      page.tsx                      # marketing/landing
      login/page.tsx
      register/page.tsx
      reset-password/page.tsx
      teachers/[slug]/page.tsx      # public teacher profile
      courses/[slug]/page.tsx       # public course page
    (protected)/
      teacher/
        dashboard/page.tsx
        courses/page.tsx
        courses/[courseId]/page.tsx
        courses/[courseId]/lessons/[lessonId]/page.tsx
        students/page.tsx
        students/[studentId]/page.tsx
        exams/page.tsx
        files/page.tsx
        settings/page.tsx
      student/
        dashboard/page.tsx
        courses/[courseId]/page.tsx
        courses/[courseId]/quizzes/[quizId]/page.tsx
      admin/
        ...
    layout.tsx                      # sets <html lang dir>, providers
  api/
    auth/{register,session,logout}/route.ts
    courses/route.ts
    courses/[courseId]/route.ts
    lessons/route.ts
    enrollments/route.ts
    quizzes/route.ts
    quizzes/[quizId]/attempts/route.ts
    files/route.ts
    uploads/sign/route.ts

components/
  ui/                # design-system primitives (button, input, dialog...)
  layout/             # sidebar, navbar, theme toggle, locale switcher
  course/             # feature components composed from ui/
  lesson/
  student/
  quiz/
  file/

lib/
  server/
    firebaseAdmin.ts
    repositories/     # ONLY layer touching Firestore/Cloudinary Admin APIs
    services/         # business logic, authorization checks
  auth/
    session.ts        # session cookie verify/create
    guards.ts          # role/ownership assertion helpers
  validation/          # Zod schemas (shared client+server)
  cloudinary/
    url.ts
    sign.ts
  errors.ts
  types/                # shared TS types/interfaces

messages/
  en.json
  ar.json

i18n/
  config.ts
  request.ts           # next-intl request config

proxy.ts               # formerly middleware.ts (renamed in Next.js 16)

docs/                   # this documentation tree

firestore.rules
firestore.indexes.json
.env.example
```

## Rationale

- `(public)` and `(protected)` route groups keep authorization boundaries
  visually obvious in the file tree without affecting the URL.
- `lib/server/repositories` is the single choke point for Firestore/
  Cloudinary Admin access — grep-able, auditable, and the natural place
  to enforce `teacherId` scoping.
- `components/ui` vs feature folders enforces the "build primitives once"
  rule from the design system.
