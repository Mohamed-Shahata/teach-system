import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { updateSubjectSchema } from "@/lib/validation/centerConfig.schema";

interface RouteContext {
  params: Promise<{ subjectId: string }>;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { subjectId } = await params;
    const session = await requireSession();
    const input = updateSubjectSchema.parse(await req.json());
    const subject = await centerConfigService.updateSubject(session, subjectId, input);
    return NextResponse.json({ subject });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { subjectId } = await params;
    const session = await requireSession();
    await centerConfigService.deleteSubject(session, subjectId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
