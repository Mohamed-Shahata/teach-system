// Firebase Cloud Messaging service worker (TASK-2601).
//
// This file is served as a static asset, so it cannot read
// `process.env.NEXT_PUBLIC_*` at build time. The Firebase client config
// values are public-safe (same ones already shipped in the browser bundle
// via lib/client/firebaseClient.ts — see docs/firebase/README.md), so
// `registerPushServiceWorker` (lib/client/firebaseMessaging.ts) passes them
// as query-string params on the registration URL instead of hardcoding a
// second copy here.
importScripts("https://www.gstatic.com/firebasejs/11.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.2.0/firebase-messaging-compat.js");

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  authDomain: params.get("authDomain"),
  projectId: params.get("projectId"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

const messaging = firebase.messaging();

// Background handler — foreground messages are handled by `onMessage` in
// lib/client/firebaseMessaging.ts instead, so the app can render them
// in-context (e.g. update the bell icon) rather than as an OS notification.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? "";
  const body = payload.notification?.body ?? payload.data?.body ?? "";

  self.registration.showNotification(title, {
    body,
    icon: "/darsi_logo.png",
    data: payload.data ?? {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.openWindow(url));
});
