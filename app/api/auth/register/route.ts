import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validation/auth.schema";
import { authService } from "@/lib/server/services/authService";
import { handleApiError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const body = registerSchema.parse(await req.json());
    const user = await authService.registerUser(body);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
