import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";
import { setQuizStatusSchema } from "@/lib/validation/quiz.schema";

interface RouteContext {
  params: Promise<{ quizId: string }>;
}

/** Distinct endpoint from a regular field update — mirrors courses'/lessons' publish-toggle shape. */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { quizId } = await params;
    const session = await requireSession();
    const { status } = setQuizStatusSchema.parse(await req.json());
    const quiz = await quizService.setQuizStatus(session, quizId, status);
    return NextResponse.json({ quiz });
  } catch (err) {
    return handleApiError(err);
  }
}
