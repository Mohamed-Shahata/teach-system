import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { centerConfigService } from "@/lib/server/services/centerConfigService";
import { createSubjectSchema } from "@/lib/validation/centerConfig.schema";

export async function GET() {
  try {
    const session = await requireSession();
    const subjects = await centerConfigService.listSubjects(session);
    // Rarely-changing, center-wide lookup list read by every role on many
    // pages — cache it in the browser for a minute instead of refetching
    // (and re-hitting Firestore) on every navigation.
    return NextResponse.json(
      { subjects },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createSubjectSchema.parse(await req.json());
    const subject = await centerConfigService.createSubject(session, input);
    return NextResponse.json({ subject }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
