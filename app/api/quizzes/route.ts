import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";
import { createQuizSchema } from "@/lib/validation/quiz.schema";

/** TASK-2105 — teacher's own standalone (course-less) exams: list + create, mirrors `/api/courses/[courseId]/quizzes`'s shape minus the `courseId` param. */
export async function GET() {
  try {
    const session = await requireSession();
    const quizzes = await quizService.listStandaloneQuizzes(session);
    return NextResponse.json({ quizzes });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createQuizSchema.parse(await req.json());
    const quiz = await quizService.createQuiz(session, input);
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
