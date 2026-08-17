/**
 * DANGER: full nuke.
 *
 * Deletes EVERY Firebase Auth account (admin/teacher/student, seeded or
 * not) and EVERY document in EVERY Firestore collection this app uses —
 * not just what a seed script created. Meant for wiping a dev/test
 * project back to empty before running `seed:full-demo`.
 *
 * This is intentionally separate from `seed-test-data.ts --reset`
 * (which only removes that script's own deterministic docs) — this one
 * removes everything, unconditionally.
 *
 * Usage:
 *   npm run reset:all -- --yes-really-delete-everything
 *
 * The `--yes-really-delete-everything` flag is required on purpose —
 * running this against the wrong Firebase project (e.g. production)
 * would be unrecoverable, so there is no "just run it" path.
 *
 * Requires the same Admin SDK env vars as the app itself
 * (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
 * — see `.env.example`). Loads `.env.local` automatically.
 */

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // No .env.local (e.g. env vars already exported in the shell) — fine.
}

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const CONFIRMED = process.argv.includes("--yes-really-delete-everything");

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable "${name}" for Firebase Admin SDK initialization.`);
  }
  return value;
}

function getAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = readRequiredEnv("FIREBASE_PROJECT_ID");
  const clientEmail = readRequiredEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = readRequiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const adminApp = getAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

/**
 * Every top-level collection the app writes to (per
 * `docs/database/collections.md`). Kept as an explicit list (rather than
 * `listCollections()`) so a typo in a new collection name shows up as a
 * missing entry here instead of silently wiping something unintended.
 */
const TOP_LEVEL_COLLECTIONS = [
  "users",
  "educationStages",
  "subjects",
  "teacherProfiles",
  "courses",
  "schedule",
  "lessons",
  "lessonProgress",
  "reviews",
  "enrollments",
  "payments",
  "teacherOfferings",
  "subscriptions",
  "subscriptionInvoices",
  "quizzes",
  "questions",
  "quizAttempts",
  "files",
  "notifications",
  "systemStats",
];

/** Deletes every doc in a collection, batching in chunks of 400. */
async function deleteCollection(collectionName: string): Promise<number> {
  const collectionRef = adminDb.collection(collectionName);
  let totalDeleted = 0;

  for (;;) {
    const snapshot = await collectionRef.limit(400).get();
    if (snapshot.empty) break;

    const batch = adminDb.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    totalDeleted += snapshot.size;
  }

  return totalDeleted;
}

/** `users/{uid}/fcmTokens` is a subcollection, so it needs its own pass before the parent doc goes away. */
async function deleteAllFcmTokenSubcollections(): Promise<number> {
  const usersSnap = await adminDb.collection("users").get();
  let totalDeleted = 0;
  for (const userDoc of usersSnap.docs) {
    const tokensSnap = await userDoc.ref.collection("fcmTokens").get();
    if (tokensSnap.empty) continue;
    const batch = adminDb.batch();
    for (const tokenDoc of tokensSnap.docs) {
      batch.delete(tokenDoc.ref);
    }
    await batch.commit();
    totalDeleted += tokensSnap.size;
  }
  return totalDeleted;
}

async function deleteAllAuthUsers(): Promise<number> {
  let totalDeleted = 0;
  let pageToken: string | undefined;

  for (;;) {
    const page = await adminAuth.listUsers(1000, pageToken);
    if (page.users.length === 0) break;

    const uids = page.users.map((u) => u.uid);
    // deleteUsers accepts up to 1000 uids per call.
    const result = await adminAuth.deleteUsers(uids);
    totalDeleted += result.successCount;
    if (result.failureCount > 0) {
      console.warn(`  ${result.failureCount} Auth account(s) failed to delete:`, result.errors.slice(0, 5));
    }

    pageToken = page.pageToken;
    if (!pageToken) break;
  }

  return totalDeleted;
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!CONFIRMED) {
    console.error(
      [
        "Refusing to run without confirmation.",
        "",
        `This will PERMANENTLY delete every Firebase Auth account and every`,
        `Firestore document in project: ${projectId ?? "(unknown — check FIREBASE_PROJECT_ID)"}`,
        "",
        "If that's really what you want, run:",
        "  npm run reset:all -- --yes-really-delete-everything",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(`Wiping Firebase project: ${projectId}\n`);

  console.log("Deleting fcmTokens subcollections...");
  const tokensDeleted = await deleteAllFcmTokenSubcollections();
  console.log(`  ${tokensDeleted} fcmToken doc(s) deleted.\n`);

  console.log("Deleting Firestore collections...");
  for (const collectionName of TOP_LEVEL_COLLECTIONS) {
    const count = await deleteCollection(collectionName);
    console.log(`  ${collectionName}: ${count} doc(s) deleted.`);
  }

  console.log("\nDeleting all Firebase Auth accounts...");
  const usersDeleted = await deleteAllAuthUsers();
  console.log(`  ${usersDeleted} Auth account(s) deleted.`);

  console.log("\nDone. The project is now empty (no accounts, no Firestore data).");
  console.log("Run `npm run seed:full-demo` to repopulate it with a full demo dataset.");
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
