import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { analyticsExportService } from "@/lib/server/services/analyticsExportService";
import { analyticsGranularitySchema } from "@/lib/validation/analytics.schema";

/**
 * `GET /api/admin/analytics/export?granularity=month|year|5year` —
 * TASK-3305. Admin-only (enforced inside `analyticsService.getOverview`,
 * same as the main `/api/admin/analytics` route), streams back a `.xlsx`
 * workbook covering the currently-filtered data — same file-download
 * shape as `app/api/exams/[examId]/export/route.ts`.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const granularityParam = new URL(req.url).searchParams.get("granularity");
    const granularity = granularityParam ? analyticsGranularitySchema.parse(granularityParam) : undefined;

    const overview = await analyticsExportService.getOverview(session, granularity);
    const buffer = await analyticsExportService.renderXlsx(overview);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="analytics-${overview.granularity}.xlsx"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
