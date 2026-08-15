import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";
import { createQuizSchema } from "@/lib/validation/quiz.schema";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    const quizzes = await quizService.listQuizzes(session, courseId);
    return NextResponse.json({ quizzes });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { courseId } = await params;
    const session = await requireSession();
    const input = createQuizSchema.parse({ ...(await req.json()), courseId });
    const quiz = await quizService.createQuiz(session, input);
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
