import "server-only";
import ExcelJS from "exceljs";
import type { Session } from "@/lib/auth/session";
import type { AnalyticsGranularity } from "@/lib/server/repositories/analyticsRepository";
import { analyticsService, type AnalyticsOverview } from "@/lib/server/services/analyticsService";

/**
 * Analytics Excel export — TASK-3305. Reuses `analyticsService.getOverview`
 * directly (same call the Analytics page's `GET /api/admin/analytics`
 * route makes) so the exported numbers can never drift from what's
 * on-screen for the same `granularity` filter — no separate query path,
 * same pattern `examReportService` uses to keep its PDF/Excel exports in
 * sync with the on-screen results panel (see
 * `docs/features/exam-results-export.md`). One sheet per section: summary
 * cards, revenue time series, subscription growth, and each of the three
 * TASK-3303 breakdowns.
 */

function addKeyValueSheet(workbook: ExcelJS.Workbook, overview: AnalyticsOverview) {
  const sheet = workbook.addWorksheet("Summary");
  sheet.addRow([`Generated: ${new Date().toISOString()}`]);
  sheet.addRow([`Range: ${overview.granularity}`]);
  sheet.addRow([]);
  const headerRow = sheet.addRow(["Metric", "Value"]);
  headerRow.font = { bold: true };
  sheet.addRow(["Total students", overview.totalStudents]);
  sheet.addRow(["Total teachers", overview.totalTeachers]);
  sheet.addRow(["Active subscriptions", overview.activeSubscriptions]);
  sheet.addRow(["Total confirmed revenue", overview.totalRevenue]);
  sheet.addRow(["Pending invoices", overview.pendingInvoices]);
  sheet.columns.forEach((column) => {
    column.width = 26;
  });
}

function addSeriesSheet(workbook: ExcelJS.Workbook, name: string, points: { period: string; value: number }[]) {
  const sheet = workbook.addWorksheet(name);
  const headerRow = sheet.addRow(["Period", "Value"]);
  headerRow.font = { bold: true };
  for (const point of points) {
    sheet.addRow([point.period, point.value]);
  }
  sheet.columns.forEach((column) => {
    column.width = 18;
  });
}

function addRankedSheet(workbook: ExcelJS.Workbook, name: string, rows: { label: string; count: number }[]) {
  const sheet = workbook.addWorksheet(name);
  const headerRow = sheet.addRow(["Name", "Active students"]);
  headerRow.font = { bold: true };
  for (const row of rows) {
    sheet.addRow([row.label, row.count]);
  }
  sheet.columns.forEach((column) => {
    column.width = 26;
  });
}

export const analyticsExportService = {
  /** TASK-3305 — Admin-only, gated inside `analyticsService.getOverview`. */
  async getOverview(session: Session, granularity?: AnalyticsGranularity): Promise<AnalyticsOverview> {
    return analyticsService.getOverview(session, granularity);
  },

  async renderXlsx(overview: AnalyticsOverview): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    addKeyValueSheet(workbook, overview);
    addSeriesSheet(workbook, "Revenue", overview.monthlyRevenue);
    addSeriesSheet(workbook, "Subscription Growth", overview.subscriptionGrowth);
    addRankedSheet(
      workbook,
      "Teachers",
      overview.teacherBreakdown.map((row) => ({ label: row.label, count: row.count })),
    );
    addRankedSheet(
      workbook,
      "Subjects",
      overview.subjectBreakdown.map((row) => ({ label: row.name.en || row.name.ar, count: row.count })),
    );
    addRankedSheet(
      workbook,
      "Stages",
      overview.stageBreakdown.map((row) => ({ label: row.name.en || row.name.ar, count: row.count })),
    );

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  },
};
