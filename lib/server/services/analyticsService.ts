import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import {
  analyticsRepository,
  buildRange,
  type AnalyticsGranularity,
  type MonthlyPoint,
} from "@/lib/server/repositories/analyticsRepository";
import { systemStatsRepository } from "@/lib/server/repositories/systemStatsRepository";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { subjectRepository, type LocalizedText } from "@/lib/server/repositories/subjectRepository";
import { educationStageRepository } from "@/lib/server/repositories/educationStageRepository";
import { userRepository } from "@/lib/server/repositories/userRepository";

export interface AnalyticsOverview {
  totalStudents: number;
  totalTeachers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  pendingInvoices: number;
  /** TASK-3304 — the granularity this overview was built with, so the UI's filter control stays in sync with what it's showing. */
  granularity: AnalyticsGranularity;
  monthlyRevenue: MonthlyPoint[];
  subscriptionGrowth: MonthlyPoint[];
  teacherBreakdown: RankedBreakdownPoint[];
  subjectBreakdown: LocalizedBreakdownPoint[];
  stageBreakdown: LocalizedBreakdownPoint[];
}

/** Teacher breakdown (TASK-3303): a teacher has no localized name, just a display name. */
export interface RankedBreakdownPoint {
  id: string;
  label: string;
  count: number;
}

/** Subject/stage breakdown (TASK-3303): both are center-wide lookups with a bilingual name. */
export interface LocalizedBreakdownPoint {
  id: string;
  name: LocalizedText;
  count: number;
}

const DEFAULT_GRANULARITY: AnalyticsGranularity = "year";

/**
 * Admin-only Analytics overview (Phase 4). Combines the existing
 * denormalized `systemStats` counters (teacher/student counts — cheap,
 * already maintained) with live-queried time series from
 * `analyticsRepository` (revenue and subscription growth — see that
 * file for why those aren't denormalized the same way).
 *
 * TASK-3304: `granularity` (default `"year"`, matching the previous
 * fixed 6-month-ish window's rough shape most closely) resolves a single
 * `AnalyticsRange` via `buildRange`, threaded through every one of
 * `analyticsRepository`'s ranged methods below — so the two time-series
 * charts and the three TASK-3303 breakdowns all move together when the
 * Admin changes the filter, per this task's acceptance criterion.
 */
export const analyticsService = {
  async getOverview(session: Session, granularity: AnalyticsGranularity = DEFAULT_GRANULARITY): Promise<AnalyticsOverview> {
    assertRole(session, "admin");

    const range = buildRange(granularity);

    const [
      stats,
      activeSubscriptions,
      totalRevenue,
      pendingInvoices,
      monthlyRevenue,
      subscriptionGrowth,
      teacherCounts,
      subjectCounts,
      activeStudentIds,
    ] = await Promise.all([
      systemStatsRepository.find(),
      analyticsRepository.activeSubscriptionCount(),
      analyticsRepository.totalConfirmedRevenue(),
      analyticsRepository.pendingInvoiceCount(),
      analyticsRepository.monthlyRevenue(range),
      analyticsRepository.monthlySubscriptionGrowth(range),
      analyticsRepository.activeStudentCountsByTeacher(range),
      analyticsRepository.activeStudentCountsBySubject(range),
      analyticsRepository.activeStudentIds(range),
    ]);

    const [teacherProfiles, subjects, stages, activeStudents] = await Promise.all([
      teacherProfileRepository.findByIds(teacherCounts.map((c) => c.id)),
      subjectRepository.list(),
      educationStageRepository.list(),
      userRepository.findByIds(activeStudentIds),
    ]);

    const teacherBreakdown: RankedBreakdownPoint[] = teacherCounts.map((c) => ({
      id: c.id,
      label: teacherProfiles.get(c.id)?.displayName ?? c.id,
      count: c.count,
    }));

    const subjectsById = new Map(subjects.map((s) => [s.id, s]));
    const subjectBreakdown: LocalizedBreakdownPoint[] = subjectCounts
      .filter((c) => subjectsById.has(c.id))
      .map((c) => ({ id: c.id, name: subjectsById.get(c.id)!.name, count: c.count }));

    const stageCounts = new Map<string, number>();
    for (const studentId of activeStudentIds) {
      const stageId = activeStudents.get(studentId)?.stageId;
      if (!stageId) continue;
      stageCounts.set(stageId, (stageCounts.get(stageId) ?? 0) + 1);
    }
    const stageBreakdown: LocalizedBreakdownPoint[] = stages
      .slice()
      .sort((a, b) => a.order - b.order)
      .filter((stage) => stageCounts.has(stage.id))
      .map((stage) => ({ id: stage.id, name: stage.name, count: stageCounts.get(stage.id) ?? 0 }));

    return {
      totalStudents: stats.totalStudents,
      totalTeachers: stats.totalTeachers,
      activeSubscriptions,
      totalRevenue,
      pendingInvoices,
      granularity,
      monthlyRevenue,
      subscriptionGrowth,
      teacherBreakdown,
      subjectBreakdown,
      stageBreakdown,
    };
  },
};
