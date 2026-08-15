# Error Handling

## Error types (`lib/errors.ts`)

```ts
export class AppError extends Error {
  constructor(public code: string, public messageKey: string, public status: number) { super(code); }
}
export class NotFoundError extends AppError { constructor(messageKey = "errors.notFound") { super("NOT_FOUND", messageKey, 404); } }
export class ForbiddenError extends AppError { constructor(messageKey = "errors.forbidden") { super("FORBIDDEN", messageKey, 403); } }
export class ValidationError extends AppError { constructor(messageKey = "errors.validation") { super("VALIDATION", messageKey, 400); } }
export class ConflictError extends AppError { constructor(messageKey = "errors.conflict") { super("CONFLICT", messageKey, 409); } }
```

## Route handler pattern

```ts
export async function POST(req: Request) {
  try {
    const body = createCourseSchema.parse(await req.json());
    const session = await requireSession(req);
    const course = await courseService.createCourse(session.uid, body);
    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    return handleApiError(err); // maps AppError -> {error:{code,messageKey}}, logs unknowns server-side, returns generic 500
  }
}
```

`handleApiError`:
- Known `AppError` → `{ error: { code, messageKey } }` with the right
  HTTP status; the client resolves `messageKey` through `next-intl`.
- Zod errors → mapped to `ValidationError` with a generic
  `errors.validation` key (field-level messages handled client-side by
  the same schema, not echoed from the server).
- Unknown errors → logged in full (English, server console / logging
  provider) with a request id, but the client only ever receives a
  generic `errors.unexpected` message — **no stack traces, no internal
  messages, no secrets** ever reach the response body.

## Cloudinary/Firestore compound operations

For operations spanning both (e.g. delete a lesson + its Cloudinary
files), the service performs external-service operations first
(Cloudinary delete) and only commits the Firestore write after success;
failures are logged with enough context to reconcile manually, and this
pattern is called out per-feature in `features/*.md` where relevant.

## Developer logs vs user-facing text

- Server logs: English, technical, may include internal identifiers.
- Anything reaching the browser: only translated `messageKey`s resolved
  through the i18n system — see `internationalization/README.md`.
