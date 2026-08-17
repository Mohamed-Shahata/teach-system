import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { reviewService } from "@/lib/server/services/reviewService";
import { upsertReviewSchema } from "@/lib/validation/review.schema";

interface RouteContext {
  params: Promise<{ teacherId: string }>;
}

/**
 * TASK-2702. `GET` prefills the student's own review (if any) on the
 * "leave a review" form; `PUT` upserts it (create on first submit, edit
 * on every subsequent one — same doc, per TASK-2701's one-per-pair rule).
 * Student-only; eligibility (enrollment with this teacher) is enforced
 * in `reviewService.upsertReview`, not here.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const review = await reviewService.getMyReview(session, teacherId);
    return NextResponse.json({ review });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const { teacherId } = await params;
    const session = await requireSession();
    const input = upsertReviewSchema.parse(await req.json());
    const review = await reviewService.upsertReview(session, teacherId, input);
    return NextResponse.json({ review });
  } catch (err) {
    return handleApiError(err);
  }
}
