import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const search = new URL(req.url).searchParams.get("search") ?? undefined;
    const teachers = await teacherManagementService.listTeachers(session, search);
    return NextResponse.json({ teachers });
  } catch (err) {
    return handleApiError(err);
  }
}
