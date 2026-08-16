import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { analyticsRepository, type MonthlyPoint } from "@/lib/server/repositories/analyticsRepository";
import { systemStatsRepository } from "@/lib/server/repositories/systemStatsRepository";

export interface AnalyticsOverview {
  totalStudents: number;
  totalTeachers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  pendingInvoices: number;
  monthlyRevenue: MonthlyPoint[];
  subscriptionGrowth: MonthlyPoint[];
}

const CHART_MONTHS = 6;

/**
 * Admin-only Analytics overview (Phase 4). Combines the existing
 * denormalized `systemStats` counters (teacher/student counts — cheap,
 * already maintained) with live-queried time series from
 * `analyticsRepository` (revenue and subscription growth — see that
 * file for why those aren't denormalized the same way).
 */
export const analyticsService = {
  async getOverview(session: Session): Promise<AnalyticsOverview> {
    assertRole(session, "admin");

    const [stats, activeSubscriptions, totalRevenue, pendingInvoices, monthlyRevenue, subscriptionGrowth] =
      await Promise.all([
        systemStatsRepository.find(),
        analyticsRepository.activeSubscriptionCount(),
        analyticsRepository.totalConfirmedRevenue(),
        analyticsRepository.pendingInvoiceCount(),
        analyticsRepository.monthlyRevenue(CHART_MONTHS),
        analyticsRepository.monthlySubscriptionGrowth(CHART_MONTHS),
      ]);

    return {
      totalStudents: stats.totalStudents,
      totalTeachers: stats.totalTeachers,
      activeSubscriptions,
      totalRevenue,
      pendingInvoices,
      monthlyRevenue,
      subscriptionGrowth,
    };
  },
};
