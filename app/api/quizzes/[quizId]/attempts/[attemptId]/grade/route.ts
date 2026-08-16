import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizAttemptService } from "@/lib/server/services/quizAttemptService";
import { gradeQuizAttemptSchema } from "@/lib/validation/quiz.schema";

interface RouteContext {
  params: Promise<{ quizId: string; attemptId: string }>;
}

/**
 * TASK-2103 — teacher/Admin sets a final score for a `pending_review`
 * attempt on a manually-graded quiz. `quizId` in the path scopes the
 * route alongside the rest of `app/api/quizzes/[quizId]/*`, but
 * `quizAttemptService.gradeAttempt` re-derives and re-checks the quiz
 * from the attempt itself (never trusting the path over the stored
 * doc), so it isn't otherwise used here.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { attemptId } = await params;
    const session = await requireSession();
    const { score } = gradeQuizAttemptSchema.parse(await req.json());
    const attempt = await quizAttemptService.gradeAttempt(session, attemptId, score);
    return NextResponse.json({ attempt });
  } catch (err) {
    return handleApiError(err);
  }
}
