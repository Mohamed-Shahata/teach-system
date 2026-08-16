import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { analyticsService } from "@/lib/server/services/analyticsService";

/** `GET /api/admin/analytics` — Admin-only overview + monthly charts for the Analytics page. */
export async function GET() {
  try {
    const session = await requireSession();
    const overview = await analyticsService.getOverview(session);
    return NextResponse.json({ overview });
  } catch (err) {
    return handleApiError(err);
  }
}
