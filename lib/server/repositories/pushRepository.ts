import "server-only";
import { getMessaging } from "firebase-admin/messaging";
import { adminApp } from "@/lib/server/firebaseAdmin";

/**
 * TASK-2603 — thin wrapper around the Firebase Admin SDK's messaging
 * `sendEachForMulticast`, kept to a single `send`/token-in,
 * `success`/`errorCode`-out shape so `pushDispatchService` (the business
 * logic — grouping by recipient, building the message, deciding which
 * failures mean "prune this token") never touches the Admin SDK directly.
 * Mirrors the rest of `repositories/` being the only layer that touches
 * an Admin API (Firestore, Cloudinary, and now FCM) — see
 * `architecture/folder-structure.md`.
 */

export interface PushMessageInput {
  title: string;
  body: string;
  /** Extra key/value payload delivered alongside the notification (e.g. `type`, `meetingUrl`) — FCM requires string values. */
  data?: Record<string, string>;
}

export interface PushSendResult {
  token: string;
  success: boolean;
  /** Set only on failure, e.g. `messaging/registration-token-not-registered` — see Firebase Admin SDK error codes. */
  errorCode?: string;
}

export const pushRepository = {
  /**
   * Sends one message to every token in `tokens`. Never throws for
   * per-token failures (expired/unregistered tokens are an expected,
   * routine outcome, not an exceptional one) — each token gets its own
   * success/errorCode result so the caller can decide what to prune.
   * Returns `[]` without calling the Admin SDK when `tokens` is empty.
   */
  async sendMulticast(tokens: string[], message: PushMessageInput): Promise<PushSendResult[]> {
    if (tokens.length === 0) return [];

    const response = await getMessaging(adminApp).sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      ...(message.data ? { data: message.data } : {}),
    });

    return response.responses.map((result, index) => ({
      token: tokens[index],
      success: result.success,
      ...(result.success ? {} : { errorCode: result.error?.code }),
    }));
  },
};
