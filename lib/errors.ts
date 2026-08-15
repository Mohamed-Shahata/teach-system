import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Base class for known, expected application errors. `messageKey` is a
 * translation key resolved client-side through next-intl — the server
 * never sends raw English error strings to the client.
 */
export class AppError extends Error {
  constructor(
    public code: string,
    public messageKey: string,
    public status: number,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(messageKey = "errors.notFound") {
    super("NOT_FOUND", messageKey, 404);
  }
}

export class ForbiddenError extends AppError {
  constructor(messageKey = "errors.forbidden") {
    super("FORBIDDEN", messageKey, 403);
  }
}

export class ValidationError extends AppError {
  constructor(messageKey = "errors.validation") {
    super("VALIDATION", messageKey, 400);
  }
}

export class ConflictError extends AppError {
  constructor(messageKey = "errors.conflict") {
    super("CONFLICT", messageKey, 409);
  }
}

export class UnauthorizedError extends AppError {
  constructor(messageKey = "errors.unauthorized") {
    super("UNAUTHORIZED", messageKey, 401);
  }
}

interface ApiErrorBody {
  error: { code: string; messageKey: string };
}

/**
 * Maps any thrown error to a safe HTTP response.
 * - Known `AppError` -> its own code/messageKey/status.
 * - `ZodError` -> a generic 400 validation error (field-level detail stays
 *   client-side, resolved from the same schema — never echoed from here).
 * - Anything else -> logged in full server-side with a request id, but the
 *   client only ever receives a generic, translated `errors.unexpected`.
 */
export function handleApiError(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, messageKey: err.messageKey } },
      { status: err.status },
    );
  }

  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION", messageKey: "errors.validation" } },
      { status: 400 },
    );
  }

  const requestId = crypto.randomUUID();
  console.error(`[${requestId}] Unhandled error:`, err);

  return NextResponse.json(
    { error: { code: "INTERNAL", messageKey: "errors.unexpected" } },
    { status: 500 },
  );
}
