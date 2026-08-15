# Validation Strategy

## Single source of truth: Zod schemas

`lib/validation/*.schema.ts` — one file per domain (course, lesson,
enrollment, quiz, question, file, auth).

```ts
// lib/validation/course.schema.ts
export const createCourseSchema = z.object({
  title: z.object({ en: z.string().min(3).max(120), ar: z.string().min(3).max(120) }),
  description: z.object({ en: z.string().max(2000), ar: z.string().max(2000) }).optional(),
  category: z.string().max(60).optional(),
});
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
```

## Usage

- **Client forms**: `react-hook-form` + `@hookform/resolvers/zod` using
  the exact same schema — gives instant UX feedback.
- **Server (route handlers/services)**: the same schema re-validates the
  request body. This is mandatory even though the client also validates —
  client-side validation is a UX convenience only, never a security
  boundary.

## What is always server-validated regardless of client state

- Form data, query params, URL params, request bodies.
- Role and tenant identifiers — never read from the body; always derived
  from the verified session (see `authorization/README.md`).
- File metadata after upload (size/type re-checked against
  Cloudinary's returned data, not just the client's pre-upload claim).

## Validation error responses

Validation failures return a structured, translated-key error (see
`security/error-handling.md`) — never a raw Zod error object with
internal field paths exposed verbatim to the client without mapping.
