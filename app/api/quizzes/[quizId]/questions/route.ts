import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";
import { createQuestionSchema, reorderQuestionsSchema } from "@/lib/validation/quiz.schema";

interface RouteContext {
  params: Promise<{ quizId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const questions = await quizService.listQuestions(session, quizId);
    return NextResponse.json({ questions });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const input = createQuestionSchema.parse(await req.json());
    const question = await quizService.createQuestion(session, quizId, input);
    return NextResponse.json({ question }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Reorders `quiz.questionIds` — same full-replace contract as the course lesson-order PATCH. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const { questionIds } = reorderQuestionsSchema.parse(await req.json());
    const quiz = await quizService.reorderQuestions(session, quizId, questionIds);
    return NextResponse.json({ quiz });
  } catch (err) {
    return handleApiError(err);
  }
}
