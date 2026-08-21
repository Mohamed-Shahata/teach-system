import "server-only";
import { subscriptionInvoiceRepository } from "@/lib/server/repositories/subscriptionInvoiceRepository";
import { subscriptionRepository, type SubscriptionDoc } from "@/lib/server/repositories/subscriptionRepository";

/**
 * TASK-3404's core query, factored out of `adminSubscriptionsDueForRenewalService`
 * so TASK-3405's notification sweep job can reuse the exact same "who's
 * due" logic without a `Session`/role check (jobs run outside a request,
 * same reasoning as `classNotificationsJob` not calling
 * `requireSession()`) and without duplicating it.
 */

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function periodOf(timestampMs: number): string {
  const d = new Date(timestampMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Every `active` subscription with no `confirmed` invoice for `period`,
 * excluding subscriptions created within `period` itself — a brand-new
 * subscription hasn't had its first billing cycle yet, so it needs a
 * first invoice, not a renewal.
 */
export async function listSubscriptionsDueForRenewal(period: string = currentPeriod()): Promise<SubscriptionDoc[]> {
  const [activeSubscriptions, confirmedForPeriod] = await Promise.all([
    subscriptionRepository.listAllActive(),
    subscriptionInvoiceRepository.listConfirmedSubscriptionIdsForPeriod(period),
  ]);

  return activeSubscriptions.filter((sub) => periodOf(sub.createdAt) !== period && !confirmedForPeriod.has(sub.id));
}
