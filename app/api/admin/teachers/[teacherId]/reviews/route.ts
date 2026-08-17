import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { reviewService } from "@/lib/server/services/reviewService";

interface RouteContext {
  params: Promise<{ teacherId: string }>;
}

/** TASK-2704 — Admin's moderation queue for one teacher's reviews (hidden + visible). */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const reviews = await reviewService.listForModeration(session, teacherId);
    return NextResponse.json({ reviews });
  } catch (err) {
    return handleApiError(err);
  }
}
