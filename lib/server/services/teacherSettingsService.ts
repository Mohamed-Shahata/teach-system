import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { destroyCloudinaryUpload } from "@/lib/server/cloudinary";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { NotFoundError } from "@/lib/errors";

/**
 * TASK-705 — Teacher account settings: fills in the `teacher/settings`
 * placeholder from Phase 7 (`docs/tasks/README.md`), same shape as
 * `studentSettingsService` (TASK-1005) and `adminSettingsService`
 * (TASK-1907) — self-service only, three actions against the session's
 * own uid: display name, password (one-time reset link, ADR 0005), and
 * avatar.
 *
 * This is the Teacher's own account picture (`users/{uid}.avatarUrl`),
 * distinct from `teacherProfiles/{teacherId}.avatarUrl` used on the
 * public `/teachers/[slug]` page (`docs/database/collections.md`) —
 * syncing/editing that public profile is a separate, not-yet-built
 * feature, not part of this settings page.
 */

export interface TeacherProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

function toProfile(user: { uid: string; email: string; displayName: string; avatarUrl?: string }): TeacherProfile {
  return { uid: user.uid, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl };
}

export const teacherSettingsService = {
  async getProfile(session: Session): Promise<TeacherProfile> {
    assertRole(session, "teacher");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();
    return toProfile(user);
  },

  async updateDisplayName(session: Session, displayName: string): Promise<TeacherProfile> {
    assertRole(session, "teacher");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();

    await adminAuth.updateUser(session.uid, { displayName });
    await userRepository.updateDisplayName(session.uid, displayName);

    return toProfile({ ...user, displayName });
  },

  /** Generates a one-time password-reset link for the Teacher's own email (ADR 0005). */
  async generatePasswordResetLink(session: Session): Promise<{ resetLink: string }> {
    assertRole(session, "teacher");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();

    const resetLink = await adminAuth.generatePasswordResetLink(user.email);
    return { resetLink };
  },

  /**
   * Persists a completed avatar upload and destroys the previous
   * Cloudinary asset, if one existed — same best-effort cleanup ordering
   * as `studentSettingsService.updateAvatar`.
   */
  async updateAvatar(session: Session, avatarUrl: string, avatarPublicId: string): Promise<TeacherProfile> {
    assertRole(session, "teacher");
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

    return toProfile({ ...user, displayName: user.displayName, avatarUrl });
  },
};
