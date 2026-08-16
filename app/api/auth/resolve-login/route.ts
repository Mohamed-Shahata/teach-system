import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { userRepository } from "@/lib/server/repositories/userRepository";

const resolveLoginSchema = z.object({ identifier: z.string().trim().min(1).max(254) });

/**
 * Translates a login identifier into the email Firebase Auth needs.
 * The client's `signInWithEmailAndPassword` only accepts an email, but
 * the login form also accepts a phone number -- so when the identifier
 * isn't an email shape, this looks the account up by its `phone` field
 * (`users/{uid}.phone`) and returns the matching email instead.
 *
 * Doesn't leak whether an identifier exists beyond "found" vs "not
 * found" -- no other account details are returned, and password
 * verification still happens entirely client-side against Firebase Auth.
 */
export async function POST(req: Request) {
  try {
    const { identifier } = resolveLoginSchema.parse(await req.json());

    if (identifier.includes("@")) {
      return NextResponse.json({ email: identifier }, { status: 200 });
    }

    const user = await userRepository.findByPhone(identifier);
    if (!user) {
      throw new NotFoundError("auth.login.errors.invalidCredentials");
    }

    return NextResponse.json({ email: user.email }, { status: 200 });
  } catch (err) {
    return handleApiError(err);
  }
}
