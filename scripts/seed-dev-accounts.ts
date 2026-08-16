/**
 * Dev-only bootstrap script — creates one Admin, one Teacher, and one
 * Student account directly via the Firebase Admin SDK, so there's someone
 * to log in as on a fresh project.
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
  role: "admin" | "teacher" | "student";
  email: string;
  password: string;
  displayName: string;
  stageId?: string;
}

const RESET_PASSWORD = process.argv.includes("--reset-password");
const RESET_DATA = process.argv.includes("--reset");

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
  {
    role: "student",
    email: process.env.SEED_STUDENT_EMAIL ?? "student@dev.local",
    password: process.env.SEED_STUDENT_PASSWORD ?? "DevStudent123!",
    displayName: process.env.SEED_STUDENT_NAME ?? "Dev Student",
    stageId: process.env.SEED_STUDENT_STAGE_ID ?? "stage-dev-placeholder",
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

  // `createdBy`: the admin seeds itself; the teacher and student are
  // recorded as created by that admin — matching what the real
  // `accountService` flow would have produced (see
  // docs/database/collections.md). Students may also be created by a
  // teacher in the real flow, but for this dev bootstrap the admin is the
  // simplest consistent choice.
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
      ...(account.role === "student" ? { stageId: account.stageId } : {}),
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
  const student = ACCOUNTS.find((a) => a.role === "student")!;

  if (RESET_DATA) {
    console.log("--reset: wiping this script's previously-seeded accounts...");
    for (const account of ACCOUNTS) {
      try {
        const user = await adminAuth.getUserByEmail(account.email);
        await adminDb.collection("users").doc(user.uid).delete();
        if (account.role === "teacher") {
          await adminDb.collection("teacherProfiles").doc(user.uid).delete();
        }
        await adminAuth.deleteUser(user.uid);
      } catch (err) {
        const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: unknown }).code : undefined;
        if (code !== "auth/user-not-found") throw err;
      }
    }
    console.log("Wipe complete.\n");
  }

  const adminUid = await seedAccount(admin, null);
  await seedAccount(teacher, adminUid);
  await seedAccount(student, adminUid);

  // Recompute `systemStats/global` from actual counts — this script
  // writes `users`/`teacherProfiles` docs directly and bypasses
  // `accountService`'s `systemStatsRepository.incrementStats` calls, so
  // without this the Admin dashboard would show zero teachers/students
  // even after this script runs.
  const [teachersCount, studentsCount] = await Promise.all([
    adminDb.collection("users").where("role", "==", "teacher").count().get(),
    adminDb.collection("users").where("role", "==", "student").count().get(),
  ]);
  await adminDb.collection("systemStats").doc("global").set(
    { totalTeachers: teachersCount.data().count, totalStudents: studentsCount.data().count },
    { merge: true },
  );

  console.log("\nDone. Log in at /en/login (or /ar/login) with any account above.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
