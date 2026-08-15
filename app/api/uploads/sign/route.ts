import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { uploadService } from "@/lib/server/services/uploadService";
import { signUploadSchema } from "@/lib/validation/upload.schema";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = signUploadSchema.parse(await req.json());
    const signature = await uploadService.signUpload(session, input);
    return NextResponse.json(signature);
  } catch (err) {
    return handleApiError(err);
  }
}
