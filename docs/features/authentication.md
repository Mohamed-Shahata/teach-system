# Feature: Authentication

See `authentication/README.md` for the full architecture. This file
tracks feature-specific UX notes:

- There is **no public registration form**. The old `/register` public
  page and open `POST /api/auth/register` route are removed.
- Admins create Teacher and Student accounts from an "Accounts" screen
  in the Admin dashboard. Teachers create Student accounts from their
  own dashboard (e.g. a "+ Add student" action, optionally pre-filling
  enrollment into one of their courses).
- Credential delivery: resolved in
  `decisions/0005-account-creation-credential-delivery.md` — Admin/Teacher
  relays a one-time password-reset link directly (no email provider
  needed); the new user sets their real password via the existing
  reset-password page.
- Login/forgot-password/reset-password forms are unchanged: fully
  localized, validated with the shared Zod auth schemas.
- Password reset uses Firebase's hosted flow with a custom, localized
  action-handler page — this is also how a newly-created user sets
  their real password the first time.
