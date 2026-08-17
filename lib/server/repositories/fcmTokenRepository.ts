import "server-only";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/server/firebaseAdmin";

/** See `docs/database/collections.md` — `users/{uid}/fcmTokens/{tokenId}`. */
export interface FcmTokenDoc {
  id: string;
  token: string;
  userAgent: string | null;
  createdAt: number;
  updatedAt: number;
}

function subcollection(uid: string) {
  return adminDb.collection("users").doc(uid).collection("fcmTokens");
}

/**
 * Deterministic doc id derived from the token itself (sha256, hex) —
 * same "derive the id instead of letting Firestore auto-generate one"
 * pattern as `enrollments`/`lessonProgress` — so re-registering the same
 * device token (e.g. every app load) upserts in place instead of piling
 * up duplicate rows, without needing a query-then-write round trip. The
 * raw token itself isn't used as the id directly since Firestore
 * document ids have stricter length/character constraints than FCM
 * tokens are guaranteed to respect.
 */
function tokenId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toFcmTokenDoc(id: string, data: FirebaseFirestore.DocumentData): FcmTokenDoc {
  return {
    id,
    token: String(data.token),
    userAgent: typeof data.userAgent === "string" ? data.userAgent : null,
    createdAt: Number(data.createdAt),
    updatedAt: Number(data.updatedAt),
  };
}

export const fcmTokenRepository = {
  async listForUser(uid: string): Promise<FcmTokenDoc[]> {
    const snap = await subcollection(uid).get();
    return snap.docs.map((doc) => toFcmTokenDoc(doc.id, doc.data()));
  },

  /**
   * Creates the token doc on first registration, or just bumps
   * `updatedAt` (last-seen) if this exact token is already registered —
   * `createdAt` is preserved across re-registrations rather than reset.
   */
  async upsert(uid: string, token: string, userAgent: string | null): Promise<FcmTokenDoc> {
    const id = tokenId(token);
    const ref = subcollection(uid).doc(id);
    const now = Date.now();

    const existing = await ref.get();
    const createdAt = existing.exists ? Number(existing.data()?.createdAt) : now;

    await ref.set({ token, userAgent, createdAt, updatedAt: now });
    return { id, token, userAgent, createdAt, updatedAt: now };
  },

  /** Removes one token — used for explicit unregister and for pruning tokens FCM reports as invalid/expired (TASK-2603). */
  async remove(uid: string, tokenDocId: string): Promise<void> {
    await subcollection(uid).doc(tokenDocId).delete();
  },
};
