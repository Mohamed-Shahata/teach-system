import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError, ValidationError } from "@/lib/errors";
import { teacherOfferingService } from "@/lib/server/services/teacherOfferingService";

/** `GET /api/admin/offerings?stageId=...` — every teacher's priced offering for one grade level. */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const stageId = new URL(req.url).searchParams.get("stageId");
    if (!stageId) throw new ValidationError();
    const offerings = await teacherOfferingService.listByStage(session, stageId);
    return NextResponse.json({ offerings });
  } catch (err) {
    return handleApiError(err);
  }
}
