import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { fileService } from "@/lib/server/services/fileService";

interface RouteContext {
  params: Promise<{ fileId: string }>;
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { fileId } = await params;
    const session = await requireSession();
    await fileService.deleteFile(session, fileId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
