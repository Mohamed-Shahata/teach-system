import "server-only";
import { subscriptionRepository } from "@/lib/server/repositories/subscriptionRepository";
import { auditNotificationService } from "@/lib/server/services/auditNotificationService";
import { currentPeriod, listSubscriptionsDueForRenewal } from "@/lib/server/services/subscriptionRenewalQuery";

/**
 * TASK-3405(b) — entry point for the daily cron trigger
 * (`app/api/cron/subscription-renewal-notifications/route.ts`), same
 * external-cron pattern as `classNotificationsJob.ts` (TASK-2001).
 *
 * Reuses TASK-3404's exact "who's due" query
 * (`subscriptionRenewalQuery.listSubscriptionsDueForRenewal`) so the
 * Admin's list and this notification never disagree on who's overdue.
 * Dedup: each subscription tracks `lastRenewalNotifiedPeriod` — a
 * subscription already notified for the current period is skipped, so a
 * student gets exactly one "renewal due" notification per overdue
 * month, not one every day the sweep runs.
 */
export async function runSubscriptionRenewalNotificationsJob(): Promise<{ notified: number }> {
  const period = currentPeriod();
  const due = await listSubscriptionsDueForRenewal(period);
  const notDueYetNotified = due.filter((sub) => sub.lastRenewalNotifiedPeriod !== period);

  for (const sub of notDueYetNotified) {
    await auditNotificationService.notify({
      action: "updated",
      entityType: "subscription",
      entityId: sub.id,
      title: { en: "Your subscription is due for renewal", ar: "اشتراكك مستحق للتجديد" },
      recipientIds: [sub.studentId],
      link: "/student/dashboard",
    });
    await subscriptionRepository.markRenewalNotified(sub.id, period);
  }

  return { notified: notDueYetNotified.length };
}
