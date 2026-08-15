/**
 * Dev-only bootstrap script — creates one Admin and one Teacher account
 * directly via the Firebase Admin SDK, so there's someone to log in as
 * on a fresh project.
 *
 * This is the one legitimate reason to bypass `accountService`
 * (`lib/server/services/accountService.ts`, TASK-604): every account
 * creation endpoint requires an *already-authenticated* Admin caller
 * (`assertRole(session, "admin")`), and there is no self-registration
 * (TASK-605) — so the very first Admin account has no API path that can
 * create it. This script is that one-time exception, run locally/by a
 * developer, never exposed as an HTTP endpoint.
 *
 * This script intentionally does not import `lib/server/*`: those modules
 * are guarded with `server-only` for Next.js bundling safety, and `tsx`
 * runs outside that environment. Keep the document shape below aligned
 * with `userRepository`, `teacherProfileRepository`, and
 * `docs/database/collections.md`.
 *
 * Usage:
 *   npm run seed:dev-accounts
 *
 * Requires the same Admin SDK env vars as the app itself
 * (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
 * — see `.env.example`). Loads `.env.local` automatically (Node 20.6+'s
 * `process.loadEnvFile`) the same file Next.js dev/build already reads,
 * so no extra setup is needed if the app itself runs locally.
 *
 * Idempotent: re-running with the same emails updates the Firestore
 * profile (display name, teacher profile) instead of failing, and
 * reuses the existing Auth account rather than erroring on
 * `auth/email-already-exists`. The password is only ever reset back to
 * the value below if you pass `--reset-password`.
 */

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // No .env.local (e.g. env vars already exported in the shell) — fine.
}

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

interface SeedAccount {
  role: "admin" | "teacher";
  email: string;
  password: string;
  displayName: string;
}

const RESET_PASSWORD = process.argv.includes("--reset-password");

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}" for Firebase Admin SDK initialization.`,
    );
  }
  return value;
}

function getSeedAdminApp() {
  const existing = getApps();
  if (existing.length) {
    return existing[0];
  }

  const projectId = readRequiredEnv("FIREBASE_PROJECT_ID");
  const clientEmail = readRequiredEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = readRequiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const adminApp = getSeedAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

const EMPTY_TEACHER_PROFILE_STATS = {
  totalStudents: 0,
  totalCourses: 0,
  totalPublishedCourses: 0,
  totalLessons: 0,
  totalEnrollments: 0,
};

const ACCOUNTS: SeedAccount[] = [
  {
    role: "admin",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@dev.local",
    password: process.env.SEED_ADMIN_PASSWORD ?? "DevAdmin123!",
    displayName: process.env.SEED_ADMIN_NAME ?? "Dev Admin",
  },
  {
    role: "teacher",
    email: process.env.SEED_TEACHER_EMAIL ?? "teacher@dev.local",
    password: process.env.SEED_TEACHER_PASSWORD ?? "DevTeacher123!",
    displayName: process.env.SEED_TEACHER_NAME ?? "Dev Teacher",
  },
];

async function getOrCreateAuthUser(account: SeedAccount): Promise<{ uid: string; created: boolean }> {
  try {
    const existing = await adminAuth.getUserByEmail(account.email);
    if (RESET_PASSWORD) {
      await adminAuth.updateUser(existing.uid, { password: account.password });
    }
    return { uid: existing.uid, created: false };
  } catch (err) {
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: unknown }).code : undefined;
    if (code !== "auth/user-not-found") throw err;
  }

  const created = await adminAuth.createUser({
    email: account.email,
    password: account.password,
    displayName: account.displayName,
    emailVerified: true,
  });
  return { uid: created.uid, created: true };
}

async function seedAccount(account: SeedAccount, adminUid: string | null): Promise<string> {
  const { uid, created } = await getOrCreateAuthUser(account);
  const createdAt = Date.now();

  // `createdBy`: the admin seeds itself; the teacher is recorded as
  // created by that admin — matching what the real `accountService` flow
  // would have produced (see docs/database/collections.md).
  const createdBy = { uid: account.role === "admin" ? uid : (adminUid ?? uid), role: "admin" as const };

  const userRef = adminDb.collection("users").doc(uid);
  const existingDoc = await userRef.get();
  if (!existingDoc.exists) {
    await userRef.create({
      uid,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      createdBy,
      createdAt,
    });

    if (account.role === "teacher") {
      await adminDb.collection("teacherProfiles").doc(uid).create({
        teacherId: uid,
        displayName: account.displayName,
        isPublic: false,
        stats: { ...EMPTY_TEACHER_PROFILE_STATS },
        createdAt,
      });
    }
  }

  console.log(
    `${created ? "Created" : "Reused"} ${account.role} — email: ${account.email}  password: ${account.password}  uid: ${uid}`,
  );
  return uid;
}

async function main() {
  const admin = ACCOUNTS.find((a) => a.role === "admin")!;
  const teacher = ACCOUNTS.find((a) => a.role === "teacher")!;

  const adminUid = await seedAccount(admin, null);
  await seedAccount(teacher, adminUid);

  console.log("\nDone. Log in at /en/login (or /ar/login) with either account above.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
