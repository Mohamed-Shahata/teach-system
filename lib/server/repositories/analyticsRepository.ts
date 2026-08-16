import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";

/**
 * Repository for the admin Analytics page (Phase 4). Unlike
 * `systemStatsRepository` (a single denormalized "current totals" doc,
 * incremented in place by feature services as events happen), the charts
 * here need a **time series** — revenue and new-subscription counts per
 * calendar month — which nothing denormalizes today. Rather than add more
 * counters to increment at every call site, this reads `subscriptions`
 * and `subscriptionInvoices` directly and buckets them by month in
 * memory: it's an Admin-only, low-traffic page, so a live scan is the
 * simpler and more honest source of truth than a second set of counters
 * that could drift from Phase 2/3's actual records.
 */
export interface MonthlyPoint {
  /** `YYYY-MM`. */
  period: string;
  value: number;
}

const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const INVOICES_COLLECTION = "subscriptionInvoices";

/** Builds the last `months` `YYYY-MM` keys, oldest first, ending at the current month. */
function lastMonthKeys(months: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function periodOf(timestampMs: number): string {
  const d = new Date(timestampMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const analyticsRepository = {
  /**
   * Monthly revenue for the last `months` calendar months — the sum of
   * `confirmed` subscription invoices' `amount`, bucketed by the invoice's
   * own `period` field (not `createdAt`), so a late confirmation still
   * counts toward the month it billed for.
   */
  async monthlyRevenue(months: number): Promise<MonthlyPoint[]> {
    const keys = lastMonthKeys(months);
    const earliest = keys[0];
    const snap = await adminDb
      .collection(INVOICES_COLLECTION)
      .where("status", "==", "confirmed")
      .where("period", ">=", earliest)
      .get();

    const totals = new Map<string, number>(keys.map((k) => [k, 0]));
    for (const doc of snap.docs) {
      const data = doc.data();
      const period = String(data.period);
      if (!totals.has(period)) continue;
      totals.set(period, (totals.get(period) ?? 0) + Number(data.amount ?? 0));
    }
    return keys.map((period) => ({ period, value: totals.get(period) ?? 0 }));
  },

  /**
   * New active subscriptions created per month, for the last `months`
   * calendar months — the "subscription growth" chart. Bucketed by
   * `createdAt`, since a subscription (unlike an invoice) has no separate
   * billing period of its own.
   */
  async monthlySubscriptionGrowth(months: number): Promise<MonthlyPoint[]> {
    const keys = lastMonthKeys(months);
    const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (months - 1), 1)).getTime();

    const snap = await adminDb.collection(SUBSCRIPTIONS_COLLECTION).where("createdAt", ">=", since).get();

    const counts = new Map<string, number>(keys.map((k) => [k, 0]));
    for (const doc of snap.docs) {
      const data = doc.data();
      const period = periodOf(Number(data.createdAt));
      if (!counts.has(period)) continue;
      counts.set(period, (counts.get(period) ?? 0) + 1);
    }
    return keys.map((period) => ({ period, value: counts.get(period) ?? 0 }));
  },

  /** Count of currently-active subscriptions — the "current" figure the growth chart trends toward. */
  async activeSubscriptionCount(): Promise<number> {
    const snap = await adminDb.collection(SUBSCRIPTIONS_COLLECTION).where("status", "==", "active").count().get();
    return snap.data().count;
  },

  /** Total confirmed revenue of all time (not just the charted window) — the Analytics page's headline figure. */
  async totalConfirmedRevenue(): Promise<number> {
    const snap = await adminDb.collection(INVOICES_COLLECTION).where("status", "==", "confirmed").get();
    return snap.docs.reduce((sum, doc) => sum + Number(doc.data().amount ?? 0), 0);
  },

  /** Count of invoices still awaiting manual review — surfaced so the Admin knows if the revenue figure is still settling. */
  async pendingInvoiceCount(): Promise<number> {
    const snap = await adminDb.collection(INVOICES_COLLECTION).where("status", "==", "pending").count().get();
    return snap.data().count;
  },
};
