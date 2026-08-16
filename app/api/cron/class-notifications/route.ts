import "server-only";
import { NextResponse } from "next/server";
import { handleApiError, UnauthorizedError } from "@/lib/errors";
import { runClassNotificationsJob } from "@/lib/server/jobs/classNotificationsJob";

/**
 * TASK-2001 — scheduled trigger infrastructure.
 *
 * Invoked by Vercel Cron (see `vercel.json`, per-minute schedule) outside
 * the normal request/response cycle — there's no user `Session` here, so
 * this route does NOT use `requireSession()`. Instead it's gated by a
 * shared secret: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
 * automatically for routes listed in `vercel.json`'s `crons` array
 * (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
 * Any request missing/mismatching that header is rejected before any
 * Firestore work happens, so this endpoint can't be triggered by anyone
 * who doesn't also have the deployment's env vars.
 *
 * The actual notification logic (TASK-2002 "class starting" push to
 * students, TASK-2003 teacher reminder) lives in
 * `lib/server/jobs/classNotificationsJob.ts`, not here — this route is
 * intentionally just the trigger + auth boundary.
 */
export async function GET(req: Request) {
  try {
    assertCronSecret(req);
    const result = await runClassNotificationsJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return handleApiError(err);
  }
}

function assertCronSecret(req: Request): void {
  const secret = process.env.CRON_SECRET;
  // Misconfigured deployment (missing secret) fails closed, same as a
  // bad/missing header — never falls through to treating the request as
  // authenticated.
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    throw new UnauthorizedError();
  }
}
