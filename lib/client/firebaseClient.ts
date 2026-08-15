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
