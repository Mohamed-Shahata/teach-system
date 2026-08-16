import "server-only";
import { NextResponse } from "next/server";
import { handleApiError, UnauthorizedError } from "@/lib/errors";
import { runClassNotificationsJob } from "@/lib/server/jobs/classNotificationsJob";

/**
 * TASK-2001 — scheduled trigger infrastructure.
 *
 * Invoked once a minute by an external cron caller (see
 * `docs/deployment/vercel.md` — Vercel Hobby rejects deploys with a
 * finer-than-daily `crons` schedule, so this is triggered by an
 * external service like cron-job.org rather than `vercel.json`) outside
 * the normal request/response cycle — there's no user `Session` here, so
 * this route does NOT use `requireSession()`. Instead it's gated by a
 * shared secret: the caller must send `Authorization: Bearer
 * <CRON_SECRET>` on every request (configured on the external cron
 * job's side, not auto-injected by Vercel).
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
