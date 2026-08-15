import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";
import { updateQuizSchema } from "@/lib/validation/quiz.schema";

interface RouteContext {
  params: Promise<{ quizId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const quiz = await quizService.getQuiz(session, quizId);
    return NextResponse.json({ quiz });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const input = updateQuizSchema.parse(await req.json());
    const quiz = await quizService.updateQuiz(session, quizId, input);
    return NextResponse.json({ quiz });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    await quizService.deleteQuiz(session, quizId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
