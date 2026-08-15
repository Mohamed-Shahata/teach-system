import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { requireSession } from "@/lib/auth/session";
import { accountService } from "@/lib/server/services/accountService";
import { createAccountSchema } from "@/lib/validation/account.schema";

/**
 * TASK-604 — Admin creates a Teacher or Student account. Role gate is
 * `accountService.createAccountByAdmin` (`assertRole(session, "admin")`);
 * this route only authenticates and validates the body.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createAccountSchema.parse(await req.json());
    const account = await accountService.createAccountByAdmin(session, input);
    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
