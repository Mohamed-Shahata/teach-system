import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherOfferingService } from "@/lib/server/services/teacherOfferingService";
import { updateTeacherOfferingSchema } from "@/lib/validation/teacherOffering.schema";

interface RouteContext {
  params: Promise<{ offeringId: string }>;
}

/** `PATCH /api/admin/offerings/{offeringId}` — Admin edits the monthly price. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { offeringId } = await params;
    const session = await requireSession();
    const input = updateTeacherOfferingSchema.parse(await req.json());
    const offering = await teacherOfferingService.updateOffering(session, offeringId, input);
    return NextResponse.json({ offering });
  } catch (err) {
    return handleApiError(err);
  }
}

/** `DELETE /api/admin/offerings/{offeringId}` — Admin removes a priced offering. */
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { offeringId } = await params;
    const session = await requireSession();
    const offering = await teacherOfferingService.deleteOffering(session, offeringId);
    return NextResponse.json({ offering });
  } catch (err) {
    return handleApiError(err);
  }
}
