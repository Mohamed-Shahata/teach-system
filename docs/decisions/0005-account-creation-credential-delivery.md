# ADR 0005: Credential Delivery for Admin/Teacher-Created Accounts

## Status
Accepted

## Context
`features/authentication.md` flagged an open question for TASK-604
(account creation is now Admin/Teacher-only, no public sign-up): how
does a newly-created Teacher or Student receive their login
credentials — an email invite, or the Admin/Teacher relaying a
temporary password directly? No email-sending provider is configured
in this project (`.env.example` has no SMTP/email-API vars), and ADR
0001 favors minimal infrastructure.

`authentication/README.md` already establishes that Firebase's hosted
password-reset flow, via the localized `/reset-password` action-handler
page, is how a newly-created user sets their real password the first
time.

## Decision
`POST /api/admin/accounts` and `POST /api/teacher/students`:

1. Create the Firebase Auth user with a long, random password that is
   never returned or persisted anywhere and is not meant to ever be
   used to sign in.
2. Generate a Firebase password-reset link for that email via the
   Admin SDK (`adminAuth.generatePasswordResetLink`) — the same
   mechanism as the existing "forgot password" flow, pointed at the
   same console-configured `/[locale]/reset-password` action URL (see
   `authentication/README.md`).
3. Return that link once, in the API response, to the Admin/Teacher who
   made the request. They relay it to the new user directly (message,
   in person, etc.) — no email provider required.

The new user opens the link, sets their own real password on
`/reset-password`, and logs in normally from then on.

## Consequences
- No email-sending infrastructure needed for MVP.
- The reset link is sensitive (it grants a one-time password set) —
  API responses that include it must never be logged, and the
  Admin/Teacher UI consuming this endpoint (Phase 7+) should treat it
  like a credential, not a permanent record.
- If self-service email invites are wanted later, only step 3 changes
  (send the same link via an email provider instead of returning it) —
  steps 1–2 stay the same.
