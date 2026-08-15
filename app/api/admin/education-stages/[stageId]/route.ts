import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { updateEducationStageSchema } from "@/lib/validation/centerConfig.schema";

interface RouteContext {
  params: Promise<{ stageId: string }>;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { stageId } = await params;
    const session = await requireSession();
    const input = updateEducationStageSchema.parse(await req.json());
    const stage = await centerConfigService.updateEducationStage(session, stageId, input);
    return NextResponse.json({ stage });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { stageId } = await params;
    const session = await requireSession();
    await centerConfigService.deleteEducationStage(session, stageId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
