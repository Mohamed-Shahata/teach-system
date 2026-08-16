import { requireSession } from "@/lib/auth/session";
import { assertRole } from "@/lib/auth/guards";
import { analyticsService } from "@/lib/server/services/analyticsService";
import { AdminAnalyticsOverview } from "@/components/admin/admin-analytics-overview";

/**
 * Phase 4 — Admin Analytics. Server-fetches the initial overview (counts +
 * the two monthly charts) the same way `AdminPaymentsPage` does, then hands
 * off to a client component so the charts (recharts, client-only) can
 * render.
 */
export default async function AdminAnalyticsPage() {
  const session = await requireSession();
  assertRole(session, "admin");

  const overview = await analyticsService.getOverview(session);

  return <AdminAnalyticsOverview initialOverview={overview} />;
}
