import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { destroyCloudinaryUpload } from "@/lib/server/cloudinary";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { NotFoundError } from "@/lib/errors";

/**
 * TASK-1907 — Admin account settings: the Admin equivalent of the
 * teacher `settings/page.tsx` placeholder from Phase 7 (never actually
 * implemented there either — see `docs/tasks/README.md` — so this has no
 * sibling to mirror and is built directly against `accountService`'s
 * (TASK-604) established patterns instead).
 *
 * Two actions only, both self-service (the session's own uid — an Admin
 * can't edit another Admin's settings here, there is no "manage other
 * admins" feature in the MVP):
 *
 * 1. Display name — a plain dual write (Firebase Auth + `users` doc),
 *    same pattern as `teacherManagementService.setTeacherDisabled`.
 * 2. Password — per ADR 0005, this project never accepts a raw new
 *    password over the wire; it generates the same Firebase
 *    password-reset link `accountService` already uses for newly created
 *    accounts, pointed at the session's own email, and lets the Admin
 *    open it themselves. No email provider is configured, so the link is
 *    surfaced directly rather than "sent".
 * 3. Profile picture (Phase 5) — same signed-upload + destroy-previous-
 *    asset flow as `teacherSettingsService.updateAvatar` /
 *    `studentSettingsService.updateAvatar`; the `avatar` upload target
 *    was already role-generic (`uploadService.resolveFolder`), so this
 *    is the Admin-side settings action that was missing.
 */

export interface AdminProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

function toProfile(user: { uid: string; email: string; displayName: string; avatarUrl?: string }): AdminProfile {
  return { uid: user.uid, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

export const adminSettingsService = {
  async getProfile(session: Session): Promise<AdminProfile> {
    assertRole(session, "admin");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();
    return toProfile(user);
  },

  async updateDisplayName(session: Session, displayName: string): Promise<AdminProfile> {
    assertRole(session, "admin");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();

    await adminAuth.updateUser(session.uid, { displayName });
    await userRepository.updateDisplayName(session.uid, displayName);

    return toProfile({ ...user, displayName });
  },

  /** Generates a one-time password-reset link for the Admin's own email (ADR 0005). */
  async generatePasswordResetLink(session: Session): Promise<{ resetLink: string }> {
    assertRole(session, "admin");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();

    const resetLink = await adminAuth.generatePasswordResetLink(user.email);
    return { resetLink };
  },

  /**
   * Persists a completed avatar upload and destroys the previous
   * Cloudinary asset, if one existed — same best-effort cleanup ordering
   * as `teacherSettingsService.updateAvatar` / `studentSettingsService.updateAvatar`.
   */
  async updateAvatar(session: Session, avatarUrl: string, avatarPublicId: string): Promise<AdminProfile> {
    assertRole(session, "admin");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();

    if (user.avatarPublicId && user.avatarPublicId !== avatarPublicId) {
      try {
        await destroyCloudinaryUpload(user.avatarPublicId, "image");
      } catch (err) {
        console.error("Failed to destroy previous avatar", err);
      }
    }

    await userRepository.updateAvatar(session.uid, avatarUrl, avatarPublicId);

    return toProfile({ ...user, avatarUrl });
  },
};
