import "server-only";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Serverless-safe Firebase Admin SDK bootstrap.
 *
 * Route Handlers, Server Components, and middleware may each run in a
 * fresh execution context, but a warm serverless container (or Next.js
 * dev-mode hot reload) can invoke this module more than once within the
 * same process. `getApps().length` guards against re-initializing the
 * default app in that case, per docs/firebase/README.md.
 *
 * `import "server-only"` ensures this module (and the private key it
 * reads) can never be pulled into a client bundle by mistake.
 */

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}" for Firebase Admin SDK initialization.`,
    );
  }
  return value;
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) {
    return existing[0];
  }

  const projectId = readRequiredEnv("FIREBASE_PROJECT_ID");
  const clientEmail = readRequiredEnv("FIREBASE_CLIENT_EMAIL");
  // Vercel/`.env` files store the private key with literal "\n" escape
  // sequences; the SDK requires real newlines.
  const privateKey = readRequiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export const adminApp: App = getAdminApp();
export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
