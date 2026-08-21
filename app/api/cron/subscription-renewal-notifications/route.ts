import "server-only";
import { NextResponse } from "next/server";
import { handleApiError, UnauthorizedError } from "@/lib/errors";
import { runSubscriptionRenewalNotificationsJob } from "@/lib/server/jobs/subscriptionRenewalNotificationsJob";

/**
 * TASK-3405(b) — daily scheduled trigger, same external-cron pattern as
 * `app/api/cron/class-notifications/route.ts` (TASK-2001): Vercel
 * Hobby's `vercel.json` crons only support daily-or-coarser schedules
 * anyway, so a once-a-day external caller (cron-job.org, per
 * `docs/deployment/vercel.md`) is a natural fit for this sweep. Gated by
 * the same `Authorization: Bearer <CRON_SECRET>` shared-secret check —
 * there's no user `Session` here, so this route does NOT use
 * `requireSession()`.
 */
export async function GET(req: Request) {
  try {
    assertCronSecret(req);
    const result = await runSubscriptionRenewalNotificationsJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return handleApiError(err);
  }
}

function assertCronSecret(req: Request): void {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    throw new UnauthorizedError();
  }
}
