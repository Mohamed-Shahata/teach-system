import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";
import { quizAttemptService } from "@/lib/server/services/quizAttemptService";
import { submitQuizAttemptSchema } from "@/lib/validation/quiz.schema";

interface RouteContext {
  params: Promise<{ quizId: string }>;
}

/**
 * TASK-3106 — owning teacher/Admin preview of a quiz, reachable
 * regardless of `status` (see `quizService.getQuizPreview`). `GET`
 * returns the quiz plus its questions in the same
 * `correctOptionIds`-stripped shape a student would receive. `POST`
 * "submits" a preview run — scored the same way a real attempt is,
 * but never persisted (`quizAttemptService.previewAttempt`), so no
 * `quizAttempts` document is ever created from this route.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const { quiz, questions } = await quizService.getQuizPreview(session, quizId);
    return NextResponse.json({ quiz, questions });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const input = submitQuizAttemptSchema.parse(await req.json());
    const result = await quizAttemptService.previewAttempt(session, quizId, input);
    return NextResponse.json({ result });
  } catch (err) {
    return handleApiError(err);
  }
}
