import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";
import { updateQuestionSchema } from "@/lib/validation/quiz.schema";

interface RouteContext {
  params: Promise<{ questionId: string }>;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { questionId } = await params;
    const session = await requireSession();
    const input = updateQuestionSchema.parse(await req.json());
    const question = await quizService.updateQuestion(session, questionId, input);
    return NextResponse.json({ question });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { questionId } = await params;
    const session = await requireSession();
    await quizService.deleteQuestion(session, questionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
