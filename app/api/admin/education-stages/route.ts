import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { createEducationStageSchema } from "@/lib/validation/centerConfig.schema";

export async function GET() {
  try {
    const session = await requireSession();
    const stages = await centerConfigService.listEducationStages(session);
    return NextResponse.json({ stages });
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
