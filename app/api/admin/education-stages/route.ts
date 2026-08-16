import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { createEducationStageSchema } from "@/lib/validation/centerConfig.schema";

export async function GET() {
  try {
    const session = await requireSession();
    const stages = await centerConfigService.listEducationStages(session);
    // Same rationale as /api/admin/subjects — rarely changes, read by every
    // role, so a short private client cache avoids redundant Firestore reads.
    return NextResponse.json(
      { stages },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createEducationStageSchema.parse(await req.json());
    const stage = await centerConfigService.createEducationStage(session, input);
    return NextResponse.json({ stage }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
