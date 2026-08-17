import { getToken, onMessage, type Messaging, type MessagePayload } from "firebase/messaging";

import { clientApp } from "@/lib/client/firebaseClient";

/**
 * TASK-2601 — FCM setup + service worker.
 *
 * This module only lands the mechanism: registering the service worker,
 * asking the browser for permission, and retrieving/watching messages.
 * It is deliberately NOT called from anywhere yet — TASK-2604 (per-user
 * push toggle, settings page) is the "appropriate point" the task
 * description asks for, and TASK-2602 (store the token server-side) is
 * needed before a token is useful. Both are separate, Not Started tasks;
 * wiring this in without them would either do nothing (no server to send
 * the token to) or prompt users with no way to opt back out.
 *
 * Messaging is only initialized lazily, inside these functions, rather
 * than at module load: `getMessaging()` throws in non-browser/unsupported
 * environments (SSR, Safari without push support), and this module is
 * imported from client components that also render during SSR.
 */

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

/**
 * Registers the FCM service worker, passing the public client config as
 * query params since a static `public/` file can't read `process.env` at
 * build time — see the comment in `firebase-messaging-sw.js`.
 */
async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  const config = clientApp.options;
  const params = new URLSearchParams({
    apiKey: config.apiKey ?? "",
    authDomain: config.authDomain ?? "",
    projectId: config.projectId ?? "",
    messagingSenderId: config.messagingSenderId ?? "",
    appId: config.appId ?? "",
  });

  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`);
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!isPushSupported()) return null;
  const { getMessaging, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  return getMessaging(clientApp);
}

/**
 * Requests browser notification permission and, if granted, returns the
 * device's FCM registration token. Returns `null` if push isn't supported
 * in this browser, permission is denied, or the VAPID key is missing.
 *
 * Callers (TASK-2604's settings toggle) are responsible for sending the
 * returned token to the server (TASK-2602) to persist it.
 */
export async function requestPushToken(): Promise<string | null> {
  if (!VAPID_KEY) {
    console.error("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — cannot request an FCM token.");
    return null;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await registerPushServiceWorker();

  try {
    return await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (error) {
    console.error("Failed to retrieve FCM token:", error);
    return null;
  }
}

/**
 * TASK-2602 — sends a freshly-obtained token to the server so it's
 * registered against the signed-in user (`fcmTokenService.registerToken`,
 * upsert semantics — safe to call again with the same token, e.g. on
 * every app load or FCM's own token-refresh). Returns `false` on any
 * network/server failure rather than throwing, since a failed sync
 * shouldn't block the rest of the app.
 */
export async function syncPushToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/notifications/fcm-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to sync FCM token with the server:", error);
    return false;
  }
}

/**
 * Subscribes to messages that arrive while the app is in the foreground
 * (the service worker's `onBackgroundMessage` handles the rest). Returns
 * an unsubscribe function, or `null` if push isn't supported here.
 */
export async function listenForForegroundMessages(
  callback: (payload: MessagePayload) => void,
): Promise<(() => void) | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  return onMessage(messaging, callback);
}
