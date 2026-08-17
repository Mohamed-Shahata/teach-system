import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { reviewService } from "@/lib/server/services/reviewService";
import { setReviewHiddenSchema } from "@/lib/validation/review.schema";

interface RouteContext {
  params: Promise<{ reviewId: string }>;
}

/** TASK-2704 — Admin-only moderation toggle. Never edits rating/comment. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { reviewId } = await params;
    const session = await requireSession();
    const { hidden } = setReviewHiddenSchema.parse(await req.json());
    await reviewService.setHidden(session, reviewId, hidden);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
