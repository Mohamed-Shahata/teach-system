import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";
import { teacherSettingsService } from "@/lib/server/services/teacherSettingsService";

/**
 * TASK-705 — Generates a one-time Firebase password-reset link for the
 * Teacher's own email (ADR 0005), mirroring
 * `admin/settings/password-reset-link` and `student/settings/password-reset-link`.
 */
export async function POST() {
  try {
    const session = await requireSession();
    const result = await teacherSettingsService.generatePasswordResetLink(session);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
