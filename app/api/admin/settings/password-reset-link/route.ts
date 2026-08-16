import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { adminSettingsService } from "@/lib/server/services/adminSettingsService";

/**
 * TASK-1907 — Generates a one-time Firebase password-reset link for the
 * Admin's own email (ADR 0005: no direct new-password field, no email
 * provider configured — the link is returned once for the Admin to open
 * themselves).
 */
export async function POST() {
  try {
    const session = await requireSession();
    const result = await adminSettingsService.generatePasswordResetLink(session);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
