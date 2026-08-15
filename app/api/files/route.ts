import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { fileService } from "@/lib/server/services/fileService";
import { createFileSchema, listFilesQuerySchema } from "@/lib/validation/file.schema";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const query = listFilesQuerySchema.parse({
      courseId: searchParams.get("courseId") ?? undefined,
      lessonId: searchParams.get("lessonId") ?? undefined,
    });
    const files = await fileService.listFiles(session, query);
    return NextResponse.json({ files });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createFileSchema.parse(await req.json());
    const file = await fileService.createFile(session, input);
    return NextResponse.json({ file }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
