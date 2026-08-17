import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { destroyCloudinaryUpload } from "@/lib/server/cloudinary";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { NotFoundError } from "@/lib/errors";

/**
 * TASK-1005 — Student account settings: the Student equivalent of the
 * Admin's `adminSettingsService` (TASK-1907), same self-service-only
 * shape (a Student can't edit anyone else's settings here). Adds one
 * action `adminSettingsService` doesn't have yet: profile picture
 * (avatar), since every role gets one per the new avatar upload target
 * on `uploadService`.
 *
 * Three actions, all against the session's own uid:
 * 1. Display name — same dual write (Firebase Auth + `users` doc).
 * 2. Password — same one-time reset-link pattern (ADR 0005) rather than
 *    accepting a raw new password.
 * 3. Avatar — the client already completed the signed Cloudinary upload
 *    (`target: "avatar"`) before calling this; this just persists the
 *    resulting URL/publicId and destroys the previous asset, if any, so
 *    replacing a picture doesn't leak an orphaned Cloudinary upload.
 */

export interface StudentProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  /** Always `true` for students since TASK-3001 (mandatory-on, no self-service toggle). Kept as a field for shape-compatibility with `TeacherProfile`, which still has a real toggle. */
  pushEnabled: boolean;
}

function toProfile(user: {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  pushEnabled?: boolean;
}): StudentProfile {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
  /**
   * TASK-2604 → superseded by TASK-3001: push notifications are now
   * mandatory-on for students (no opt-out), so `pushEnabled` is always
   * reported `true` regardless of what's stored on the doc — the
   * self-service toggle (and its API route) was removed. The field
   * itself is left in place on `UserDoc` (rather than migrated away)
   * since `pushDispatchService` still reads it for teachers/admins, who
   * keep the opt-out.
   */
  pushEnabled: true,
  };
}

export const studentSettingsService = {
  async getProfile(session: Session): Promise<StudentProfile> {
    assertRole(session, "student");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();
    return toProfile(user);
  },

  async updateDisplayName(session: Session, displayName: string): Promise<StudentProfile> {
    assertRole(session, "student");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();

    await adminAuth.updateUser(session.uid, { displayName });
    await userRepository.updateDisplayName(session.uid, displayName);

    return toProfile({ ...user, displayName });
  },

  /** Generates a one-time password-reset link for the Student's own email (ADR 0005). */
  async generatePasswordResetLink(session: Session): Promise<{ resetLink: string }> {
    assertRole(session, "student");
    const user = await userRepository.findById(session.uid);
    if (!user) throw new NotFoundError();

    const resetLink = await adminAuth.generatePasswordResetLink(user.email);
    return { resetLink };
  },

  /**
   * Persists a completed avatar upload and destroys the previous
   * Cloudinary asset, if one existed — the same
   * destroy-then-update compound-operation ordering used for course
   * thumbnails (docs/security/error-handling.md), except here the
   * Firestore write is what must not be lost, so the old asset is
   * destroyed first and a destroy failure is logged, not thrown, rather
   * than blocking the user from saving their new picture over a
   * best-effort cleanup step.
   */
  async updateAvatar(session: Session, avatarUrl: string, avatarPublicId: string): Promise<StudentProfile> {
    assertRole(session, "student");
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
