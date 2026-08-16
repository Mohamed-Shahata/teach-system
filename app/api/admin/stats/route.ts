import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { systemStatsService } from "@/lib/server/services/systemStatsService";

export async function GET() {
  try {
    const session = await requireSession();
    const stats = await systemStatsService.getStats(session);
    return NextResponse.json({ stats });
  } catch (err) {
    return handleApiError(err);
  }
}
