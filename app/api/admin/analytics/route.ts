import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { analyticsService } from "@/lib/server/services/analyticsService";
import { analyticsGranularitySchema } from "@/lib/validation/analytics.schema";

/**
 * `GET /api/admin/analytics` — Admin-only overview + charts for the
 * Analytics page. TASK-3304: optional `?granularity=month|year|5year`
 * (defaults to the service's own default, `"year"`) drives every chart
 * and breakdown on the page from the same window.
 */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const granularityParam = new URL(req.url).searchParams.get("granularity");
    const granularity = granularityParam ? analyticsGranularitySchema.parse(granularityParam) : undefined;
    const overview = await analyticsService.getOverview(session, granularity);
    return NextResponse.json({ overview });
  } catch (err) {
    return handleApiError(err);
  }
}
