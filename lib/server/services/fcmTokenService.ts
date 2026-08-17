import "server-only";
import type { Session } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { fcmTokenRepository, type FcmTokenDoc } from "@/lib/server/repositories/fcmTokenRepository";
import type { RegisterFcmTokenInput } from "@/lib/validation/fcmToken.schema";

/**
 * FCM device-token registry — TASK-2602. Every signed-in role (student,
 * teacher, admin) can register a token; there's no role gate here since
 * push notifications aren't role-specific, unlike most of this codebase's
 * owner-scoped data. Everything is scoped to the caller's own `uid` —
 * there's no admin/cross-user read here, since token values themselves
 * are only ever consumed server-side (TASK-2603's dispatch), never
 * displayed.
 */
export const fcmTokenService = {
  async registerToken(session: Session, input: RegisterFcmTokenInput): Promise<FcmTokenDoc> {
    return fcmTokenRepository.upsert(session.uid, input.token, input.userAgent ?? null);
  },

  async listMyTokens(session: Session): Promise<FcmTokenDoc[]> {
    return fcmTokenRepository.listForUser(session.uid);
  },

  /** Explicit unregister (e.g. disabling push in settings, TASK-2604) — only the owning user may remove their own token. */
  async removeToken(session: Session, tokenId: string): Promise<void> {
    const existing = await fcmTokenRepository.listForUser(session.uid);
    if (!existing.some((doc) => doc.id === tokenId)) {
      throw new NotFoundError();
    }
    await fcmTokenRepository.remove(session.uid, tokenId);
  },
};
