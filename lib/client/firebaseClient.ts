import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Client SDK config — all `NEXT_PUBLIC_*`, safe to ship to the browser.
 * Used only for `createUserWithEmailAndPassword` / `signInWithEmailAndPassword`
 * and `onAuthStateChanged` (UI reactivity). It is never used to read/write
 * Firestore directly for owner-owned data — see docs/firebase/README.md.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // Added for TASK-2601 (FCM): messaging requires these on top of the
  // Auth-only config this file previously shipped. Both are public-safe,
  // same as the three fields above — see docs/firebase/README.md.
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getClientApp(): FirebaseApp {
  const existing = getApps();
  if (existing.length) {
    return existing[0];
  }
  return initializeApp(firebaseConfig);
}

export const clientApp: FirebaseApp = getClientApp();
export const clientAuth: Auth = getAuth(clientApp);
