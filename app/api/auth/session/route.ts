import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/errors";
import { createSessionCookieValue, setSessionCookie } from "@/lib/auth/session";

const sessionSchema = z.object({ idToken: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { idToken } = sessionSchema.parse(await req.json());
    const cookieValue = await createSessionCookieValue(idToken);

    const res = NextResponse.json({ ok: true }, { status: 200 });
    setSessionCookie(res.cookies, cookieValue);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
