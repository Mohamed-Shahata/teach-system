import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { quizService } from "@/lib/server/services/quizService";

/** TASK-2104 — a student's "exams for my stage" list: published, already-open standalone exams targeting their `stageId`. */
export async function GET() {
  try {
    const session = await requireSession();
    const exams = await quizService.listExamsForStudent(session);
    return NextResponse.json({ exams });
  } catch (err) {
    return handleApiError(err);
  }
}
