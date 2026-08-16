import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { studentSettingsService } from "@/lib/server/services/studentSettingsService";

/**
 * TASK-1005 — Generates a one-time Firebase password-reset link for the
 * Student's own email (ADR 0005: no direct new-password field, no email
 * provider configured — the link is returned once for the Student to
 * open themselves), mirroring `admin/settings/password-reset-link`.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const result = await studentSettingsService.generatePasswordResetLink(session);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
