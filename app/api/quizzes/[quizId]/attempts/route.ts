import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizAttemptService } from "@/lib/server/services/quizAttemptService";
import { submitQuizAttemptSchema } from "@/lib/validation/quiz.schema";

interface RouteContext {
  params: Promise<{ quizId: string }>;
}

/**
 * TASK-1204 — student-facing quiz attempts, backing the quiz-taking UI
 * and results view. `GET` is the signed-in student's own attempt
 * history for this quiz, most recent first (a student may retake a
 * quiz — see `quizAttemptRepository.listByStudentAndQuiz` — so the
 * results view uses this to show past scores and decide whether to
 * offer a retake). `POST` submits a new attempt. Both are thin
 * wrappers over `quizAttemptService` (TASK-1202), which already does
 * all grading/enrollment/role authorization — this route adds no
 * authorization logic of its own, same as every other route in
 * `app/api/quizzes/*`.
 *
 * `GET` branches by role (TASK-2103): a student gets their own attempt
 * history (`listMyAttempts`); a teacher/Admin gets every attempt at the
 * quiz (`listAttemptsForQuiz`, ownership-checked there), backing the
 * manual-grading screen's `pending_review` queue.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const attempts =
      session.role === "student"
        ? await quizAttemptService.listMyAttempts(session, quizId)
        : await quizAttemptService.listAttemptsForQuiz(session, quizId);
    return NextResponse.json({ attempts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const input = submitQuizAttemptSchema.parse(await req.json());
    const attempt = await quizAttemptService.submitAttempt(session, quizId, input);
    return NextResponse.json({ attempt }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
