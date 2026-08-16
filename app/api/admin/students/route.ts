import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentManagementService } from "@/lib/server/services/studentManagementService";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const search = new URL(req.url).searchParams.get("search") ?? undefined;
    const students = await studentManagementService.listStudents(session, search);
    return NextResponse.json({ students });
  } catch (err) {
    return handleApiError(err);
  }
}
