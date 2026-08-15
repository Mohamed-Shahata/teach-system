# Feature: Authentication

See `authentication/README.md` for the full architecture. This file
tracks feature-specific UX notes:

- Registration form asks for role selection (teacher/student) up front;
  role cannot be changed after registration in the MVP.
- Login/registration forms are fully localized and validated with the
  shared Zod auth schemas (`lib/validation/auth.schema.ts`).
- Password reset uses Firebase's hosted flow with a custom, localized
  action-handler page.
