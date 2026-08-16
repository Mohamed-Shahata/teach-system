/**
 * Dev-only test-data bootstrap — creates several teachers with *different*
 * subject specialties, several students spread across *different*
 * education stages, and everything that connects them (teacherOfferings,
 * courses, enrollments, schedule slots) so there's real, varied data to
 * click through manually or drive an end-to-end test with.
 *
 * Companion to `seed-dev-accounts.ts` (that script gives you exactly one
 * admin/teacher/student to log in as; this one fleshes out a whole
 * dataset around them). Same rationale for bypassing `lib/server/*`
 * applies here — see the header comment in `seed-dev-accounts.ts`.
 *
 * One of the schedule slots created below is deliberately set to "live
 * right now" (today's weekday, start time = 5 minutes ago) with a
 * `meetingUrl` already filled in, so you can log in as that slot's
 * teacher and immediately exercise the Phase 6 "send meeting link to
 * all students" flow without waiting for a real class time.
 *
 * Usage:
 *   npm run seed:test-data
 *   npm run seed:test-data -- --reset   (wipe this script's own data first, then reseed clean)
 *
 * Requires the same Admin SDK env vars as the app itself
 * (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
 * — see `.env.example`). Loads `.env.local` automatically, same as
 * `seed-dev-accounts.ts`.
 *
 * Idempotent: every document uses a deterministic id derived from its
 * natural key (subject slug, `${teacherUid}_${subjectId}_${stageId}`,
 * etc.), so re-running the script only fills in whatever is still
 * missing instead of duplicating data. Auth accounts are looked up by
 * email and reused if they already exist (same as `seed-dev-accounts.ts`);
 * pass `--reset-password` to reset all seeded accounts back to the
 * passwords below.
 *
 * `--reset`: deletes every doc/Auth-account this script itself created
 * (by the same deterministic ids/emails below) before reseeding, so you
 * always end up with exactly one clean copy of this dataset — it never
 * touches unrelated data added elsewhere (e.g. through the Admin UI).
 */

try {
  process.loadEnvFile?.(".env.local");
} catch {
  // No .env.local (e.g. env vars already exported in the shell) — fine.
}

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const RESET_PASSWORD = process.argv.includes("--reset-password");
const RESET_DATA = process.argv.includes("--reset");
const DEFAULT_PASSWORD = "DevPass123!";

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable "${name}" for Firebase Admin SDK initialization.`);
  }
  return value;
}

function getSeedAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = readRequiredEnv("FIREBASE_PROJECT_ID");
  const clientEmail = readRequiredEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = readRequiredEnv("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n");

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const adminApp = getSeedAdminApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

// ---------------------------------------------------------------------
// Reference data — education stages & subjects. Deterministic ids so
// re-running is a no-op once they exist.
// ---------------------------------------------------------------------

interface StageSeed {
  id: string;
  order: number;
  category: "nursery" | "primary" | "prep" | "secondary";
  name: { en: string; ar: string };
}

const STAGES: StageSeed[] = [
  { id: "stage-primary-1", order: 1, category: "primary", name: { en: "Primary 1", ar: "الصف الأول الابتدائي" } },
  { id: "stage-primary-2", order: 2, category: "primary", name: { en: "Primary 2", ar: "الصف الثاني الابتدائي" } },
  { id: "stage-primary-3", order: 3, category: "primary", name: { en: "Primary 3", ar: "الصف الثالث الابتدائي" } },
  { id: "stage-primary-4", order: 4, category: "primary", name: { en: "Primary 4", ar: "الصف الرابع الابتدائي" } },
  { id: "stage-primary-5", order: 5, category: "primary", name: { en: "Primary 5", ar: "الصف الخامس الابتدائي" } },
  { id: "stage-prep-1", order: 6, category: "prep", name: { en: "Prep 1", ar: "الصف الأول الإعدادي" } },
  { id: "stage-prep-2", order: 7, category: "prep", name: { en: "Prep 2", ar: "الصف الثاني الإعدادي" } },
  { id: "stage-secondary-1", order: 8, category: "secondary", name: { en: "Secondary 1", ar: "الصف الأول الثانوي" } },
  { id: "stage-secondary-2", order: 9, category: "secondary", name: { en: "Secondary 2", ar: "الصف الثاني الثانوي" } },
  { id: "stage-secondary-3", order: 10, category: "secondary", name: { en: "Secondary 3", ar: "الصف الثالث الثانوي" } },
];

interface SubjectSeed {
  id: string;
  name: { en: string; ar: string };
}

const SUBJECTS: SubjectSeed[] = [
  { id: "subject-math", name: { en: "Math", ar: "رياضيات" } },
  { id: "subject-physics", name: { en: "Physics", ar: "فيزياء" } },
  { id: "subject-chemistry", name: { en: "Chemistry", ar: "كيمياء" } },
  { id: "subject-biology", name: { en: "Biology", ar: "أحياء" } },
  { id: "subject-arabic", name: { en: "Arabic", ar: "لغة عربية" } },
  { id: "subject-english", name: { en: "English", ar: "لغة إنجليزية" } },
];

// ---------------------------------------------------------------------
// Teachers — each with one specialty subject and a handful of stages
// they teach that subject at. `liveSlotStageIndex` (optional) marks
// which of `stageIds` should get the "live right now" schedule slot
// with a meeting link already set.
// ---------------------------------------------------------------------

interface TeacherSeed {
  key: string;
  email: string;
  displayName: string;
  subjectId: string;
  stageIds: string[];
  liveSlotStageIndex?: number;
}

const TEACHERS: TeacherSeed[] = [
  {
    key: "teacher-math",
    email: "ahmed.math@dev.local",
    displayName: "Ahmed Hassan",
    subjectId: "subject-math",
    stageIds: ["stage-prep-1", "stage-prep-2", "stage-secondary-1"],
    liveSlotStageIndex: 0, // stage-prep-1 slot will be "live now"
  },
  {
    key: "teacher-physics",
    email: "mona.physics@dev.local",
    displayName: "Mona Youssef",
    subjectId: "subject-physics",
    stageIds: ["stage-secondary-1", "stage-secondary-2", "stage-secondary-3"],
  },
  {
    key: "teacher-chemistry",
    email: "sara.chem@dev.local",
    displayName: "Sara Ibrahim",
    subjectId: "subject-chemistry",
    stageIds: ["stage-secondary-2", "stage-secondary-3"],
  },
  {
    key: "teacher-arabic",
    email: "khaled.arabic@dev.local",
    displayName: "Khaled Adel",
    subjectId: "subject-arabic",
    stageIds: ["stage-primary-4", "stage-primary-5", "stage-prep-1"],
  },
  {
    key: "teacher-english",
    email: "laila.english@dev.local",
    displayName: "Laila Fathy",
    subjectId: "subject-english",
    stageIds: ["stage-primary-4", "stage-primary-5", "stage-prep-2"],
  },
];

// ---------------------------------------------------------------------
// Students — spread across every stage above, 1-2 per stage. Each one
// gets enrolled in every course offered at their own stage, so a
// teacher who teaches multiple stages (e.g. Ahmed: prep-1/prep-2/sec-1)
// ends up with *different* student groups per stage — the exact
// scenario item 18's "same teacher AND same stage" filter needs to be
// tested against.
// ---------------------------------------------------------------------

interface StudentSeed {
  key: string;
  email: string;
  displayName: string;
  stageId: string;
}

const STUDENTS: StudentSeed[] = [
  { key: "student-1", email: "youssef.s1@dev.local", displayName: "Youssef Mahmoud", stageId: "stage-prep-1" },
  { key: "student-2", email: "nour.s2@dev.local", displayName: "Nour Ali", stageId: "stage-prep-1" },
  { key: "student-3", email: "habiba.s3@dev.local", displayName: "Habiba Said", stageId: "stage-prep-2" },
  { key: "student-4", email: "omar.s4@dev.local", displayName: "Omar Reda", stageId: "stage-primary-4" },
  { key: "student-5", email: "farida.s5@dev.local", displayName: "Farida Nabil", stageId: "stage-primary-4" },
  { key: "student-6", email: "karim.s6@dev.local", displayName: "Karim Adham", stageId: "stage-primary-5" },
  { key: "student-7", email: "salma.s7@dev.local", displayName: "Salma Tarek", stageId: "stage-secondary-1" },
  { key: "student-8", email: "mostafa.s8@dev.local", displayName: "Mostafa Gaber", stageId: "stage-secondary-2" },
  { key: "student-9", email: "nada.s9@dev.local", displayName: "Nada Hisham", stageId: "stage-secondary-3" },
  { key: "student-10", email: "ziad.s10@dev.local", displayName: "Ziad Younes", stageId: "stage-secondary-3" },
];

/** How many months of subscription/invoice history to backfill (feeds the Admin Analytics charts' 6-month window). */
const SUBSCRIPTION_HISTORY_MONTHS = 6;

const EMPTY_TEACHER_PROFILE_STATS = {
  totalStudents: 0,
  totalCourses: 0,
  totalPublishedCourses: 0,
  totalLessons: 0,
  totalEnrollments: 0,
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

async function getOrCreateAuthUser(
  email: string,
  displayName: string,
): Promise<{ uid: string; created: boolean }> {
  try {
    const existing = await adminAuth.getUserByEmail(email);
    if (RESET_PASSWORD) {
      await adminAuth.updateUser(existing.uid, { password: DEFAULT_PASSWORD });
    }
    return { uid: existing.uid, created: false };
  } catch (err) {
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: unknown }).code : undefined;
    if (code !== "auth/user-not-found") throw err;
  }

  const created = await adminAuth.createUser({ email, password: DEFAULT_PASSWORD, displayName, emailVerified: true });
  return { uid: created.uid, created: true };
}

/** Create-if-missing for a deterministic-id doc — idempotent by construction. */
async function ensureDoc(
  collection: string,
  id: string,
  data: FirebaseFirestore.DocumentData,
): Promise<{ created: boolean }> {
  const ref = adminDb.collection(collection).doc(id);
  const existing = await ref.get();
  if (existing.exists) return { created: false };
  await ref.create(data);
  return { created: true };
}

function courseId(teacherUid: string, subjectId: string, stageId: string): string {
  return `course_${teacherUid}_${subjectId}_${stageId}`;
}

function offeringId(teacherUid: string, subjectId: string, stageId: string): string {
  return `offering_${teacherUid}_${subjectId}_${stageId}`;
}

function scheduleId(teacherUid: string, subjectId: string, stageId: string): string {
  return `slot_${teacherUid}_${subjectId}_${stageId}`;
}

function enrollmentId(studentUid: string, course: string): string {
  return `${studentUid}_${course}`;
}

function subscriptionId(studentUid: string, offeringId: string): string {
  return `sub_${studentUid}_${offeringId}`;
}

function invoiceId(subId: string, period: string): string {
  return `inv_${subId}_${period}`;
}

/** `YYYY-MM` for `monthsAgo` calendar months before now (0 = current month). */
function periodMonthsAgo(monthsAgo: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Epoch ms for the 1st of `monthsAgo` calendar months before now. */
function timestampMonthsAgo(monthsAgo: number): number {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1)).getTime();
}

/** `HH:MM` for `minutesAgo` minutes before now — used for the "live now" slot. */
function timeMinutesAgo(minutesAgo: number): string {
  const t = new Date(Date.now() - minutesAgo * 60_000);
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

/**
 * `--reset`: deletes exactly the docs (and Auth accounts) this script's
 * own deterministic ids/emails would create — never a blind collection
 * wipe, so data added elsewhere (e.g. through the Admin UI) is left
 * alone. Run this before creating anything, so a rerun always starts
 * from a clean, single copy of this dataset instead of layering on top
 * of what's already there.
 */
async function wipeSeedData(): Promise<void> {
  console.log("--reset: wiping this script's previously-seeded data...");

  const teacherUids: Record<string, string> = {};
  for (const teacher of TEACHERS) {
    try {
      const user = await adminAuth.getUserByEmail(teacher.email);
      teacherUids[teacher.key] = user.uid;
    } catch (err) {
      const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: unknown }).code : undefined;
      if (code !== "auth/user-not-found") throw err;
    }
  }

  for (const teacher of TEACHERS) {
    const uid = teacherUids[teacher.key];
    if (!uid) continue;
    for (const stageId of teacher.stageIds) {
      const cId = courseId(uid, teacher.subjectId, stageId);
      const oId = offeringId(uid, teacher.subjectId, stageId);
      const sId = scheduleId(uid, teacher.subjectId, stageId);

      const enrollmentsSnap = await adminDb.collection("enrollments").where("courseId", "==", cId).get();
      await Promise.all(enrollmentsSnap.docs.map((doc) => doc.ref.delete()));

      await Promise.all([
        adminDb.collection("courses").doc(cId).delete(),
        adminDb.collection("teacherOfferings").doc(oId).delete(),
        adminDb.collection("schedule").doc(sId).delete(),
      ]);
    }
    await adminDb.collection("teacherProfiles").doc(uid).delete();
    await adminDb.collection("users").doc(uid).delete();
    await adminAuth.deleteUser(uid).catch(() => {});
  }

  for (const student of STUDENTS) {
    try {
      const user = await adminAuth.getUserByEmail(student.email);

      const subsSnap = await adminDb.collection("subscriptions").where("studentId", "==", user.uid).get();
      for (const subDoc of subsSnap.docs) {
        const invoicesSnap = await adminDb.collection("subscriptionInvoices").where("subscriptionId", "==", subDoc.id).get();
        await Promise.all(invoicesSnap.docs.map((doc) => doc.ref.delete()));
        await subDoc.ref.delete();
      }

      await adminDb.collection("users").doc(user.uid).delete();
      await adminAuth.deleteUser(user.uid);
    } catch (err) {
      const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: unknown }).code : undefined;
      if (code !== "auth/user-not-found") throw err;
    }
  }

  for (const stage of STAGES) {
    await adminDb.collection("educationStages").doc(stage.id).delete();
  }
  for (const subject of SUBJECTS) {
    await adminDb.collection("subjects").doc(subject.id).delete();
  }

  console.log("Wipe complete.\n");
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

async function main() {
  if (RESET_DATA) {
    await wipeSeedData();
  }

  const now = Date.now();
  let created = 0;
  let reused = 0;
  const track = (wasCreated: boolean) => (wasCreated ? created++ : reused++);

  // 1. Reference data: stages + subjects.
  for (const stage of STAGES) {
    const { created: c } = await ensureDoc("educationStages", stage.id, {
      order: stage.order,
      category: stage.category,
      name: stage.name,
    });
    track(c);
  }
  for (const subject of SUBJECTS) {
    const { created: c } = await ensureDoc("subjects", subject.id, { name: subject.name, createdAt: now });
    track(c);
  }
  console.log(`Stages + subjects ready (${STAGES.length} stages, ${SUBJECTS.length} subjects).`);

  // 2. Teachers: Auth account + user doc + teacherProfile, then their
  //    offerings/courses/schedule slots per stage they teach.
  const teacherUids: Record<string, string> = {};

  for (const teacher of TEACHERS) {
    const { uid, created: authCreated } = await getOrCreateAuthUser(teacher.email, teacher.displayName);
    teacherUids[teacher.key] = uid;

    const { created: userCreated } = await ensureDoc("users", uid, {
      uid,
      email: teacher.email,
      displayName: teacher.displayName,
      role: "teacher",
      createdBy: { uid, role: "teacher" },
      createdAt: now,
    });
    track(userCreated);

    const { created: profileCreated } = await ensureDoc("teacherProfiles", uid, {
      teacherId: uid,
      displayName: teacher.displayName,
      isPublic: true,
      stats: { ...EMPTY_TEACHER_PROFILE_STATS },
      createdAt: now,
    });
    track(profileCreated);

    for (const [index, stageId] of teacher.stageIds.entries()) {
      const cId = courseId(uid, teacher.subjectId, stageId);
      const oId = offeringId(uid, teacher.subjectId, stageId);
      const sId = scheduleId(uid, teacher.subjectId, stageId);
      const isLiveSlot = teacher.liveSlotStageIndex === index;

      const { created: courseCreated } = await ensureDoc("courses", cId, {
        teacherId: uid,
        subjectId: teacher.subjectId,
        stageId,
        slug: `${teacher.key}-${stageId}`,
        title: { en: `${teacher.displayName.split(" ")[0]}'s course`, ar: `كورس ${teacher.displayName}` },
        status: "published",
        lessonOrder: [],
        enrollmentType: "paid",
        price: 300,
        currency: "EGP",
        createdAt: now,
        updatedAt: now,
      });
      track(courseCreated);

      const { created: offeringCreated } = await ensureDoc("teacherOfferings", oId, {
        teacherId: uid,
        subjectId: teacher.subjectId,
        stageId,
        monthlyPrice: 300,
        createdAt: now,
        updatedAt: now,
      });
      track(offeringCreated);

      const { created: slotCreated } = await ensureDoc("schedule", sId, {
        teacherId: uid,
        subjectId: teacher.subjectId,
        stageId,
        courseId: cId,
        dayOfWeek: isLiveSlot ? new Date().getDay() : (index + 1) % 7,
        startTime: isLiveSlot ? timeMinutesAgo(5) : "17:00",
        durationMinutes: 90,
        ...(isLiveSlot ? { meetingUrl: "https://meet.google.com/dev-test-link" } : {}),
        createdAt: now,
        updatedAt: now,
      });
      track(slotCreated);

      if (isLiveSlot) {
        console.log(
          `  -> "Live now" schedule slot for ${teacher.displayName} / ${teacher.subjectId} / ${stageId} (id: ${sId}) with meetingUrl already set.`,
        );
      }
    }

    console.log(
      `${authCreated ? "Created" : "Reused"} teacher — ${teacher.displayName} <${teacher.email}> password: ${DEFAULT_PASSWORD}  specialty: ${teacher.subjectId}  stages: ${teacher.stageIds.join(", ")}`,
    );
  }

  // 3. Students: Auth account + user doc, then enroll in every course
  //    offered at their own stage.
  for (const student of STUDENTS) {
    const { uid, created: authCreated } = await getOrCreateAuthUser(student.email, student.displayName);

    const { created: userCreated } = await ensureDoc("users", uid, {
      uid,
      email: student.email,
      displayName: student.displayName,
      role: "student",
      stageId: student.stageId,
      createdBy: { uid, role: "student" },
      createdAt: now,
    });
    track(userCreated);

    const teachersAtStage = TEACHERS.filter((teacher) => teacher.stageIds.includes(student.stageId));
    const coursesAtStage = teachersAtStage.map((teacher) => courseId(teacherUids[teacher.key], teacher.subjectId, student.stageId));

    for (const cId of coursesAtStage) {
      const course = await adminDb.collection("courses").doc(cId).get();
      if (!course.exists) continue;
      const courseData = course.data()!;
      const eId = enrollmentId(uid, cId);
      const { created: enrollmentCreated } = await ensureDoc("enrollments", eId, {
        studentId: uid,
        courseId: cId,
        teacherId: String(courseData.teacherId),
        status: "active",
        enrollmentDate: now,
        progress: { completedLessonIds: [], percent: 0 },
      });
      track(enrollmentCreated);
    }

    // Subscriptions + invoices: one active subscription per teacher the
    // student studies with at their stage, so the Admin Analytics charts
    // (revenue + subscription growth, `analyticsRepository`) and the
    // active-subscriptions counter have real data to show instead of
    // rendering empty. Subscriptions are staggered across the last
    // `SUBSCRIPTION_HISTORY_MONTHS` months (by student index) so the
    // growth chart trends upward instead of spiking in a single month;
    // each subscription gets one `confirmed` invoice per month since it
    // started (the current month is left `pending` for a couple of
    // subscriptions so `pendingInvoices` isn't always zero either).
    for (const [teacherIndex, teacher] of teachersAtStage.entries()) {
      const teacherUid = teacherUids[teacher.key];
      const oId = offeringId(teacherUid, teacher.subjectId, student.stageId);
      const offering = await adminDb.collection("teacherOfferings").doc(oId).get();
      if (!offering.exists) continue;
      const monthlyPrice = Number(offering.data()!.monthlyPrice ?? 300);

      const studentIndex = STUDENTS.findIndex((s) => s.key === student.key);
      const startMonthsAgo = Math.min(SUBSCRIPTION_HISTORY_MONTHS - 1, (studentIndex + teacherIndex) % SUBSCRIPTION_HISTORY_MONTHS);

      const subId = subscriptionId(uid, oId);
      const { created: subCreated } = await ensureDoc("subscriptions", subId, {
        studentId: uid,
        teacherId: teacherUid,
        offeringId: oId,
        subjectId: teacher.subjectId,
        stageId: student.stageId,
        status: "active",
        createdAt: timestampMonthsAgo(startMonthsAgo),
      });
      track(subCreated);

      const leavePendingCurrentMonth = (studentIndex + teacherIndex) % 4 === 0;
      for (let m = startMonthsAgo; m >= 0; m -= 1) {
        const period = periodMonthsAgo(m);
        const isCurrentMonth = m === 0;
        const status = isCurrentMonth && leavePendingCurrentMonth ? "pending" : "confirmed";
        const invId = invoiceId(subId, period);
        const { created: invCreated } = await ensureDoc("subscriptionInvoices", invId, {
          subscriptionId: subId,
          studentId: uid,
          teacherId: teacherUid,
          offeringId: oId,
          period,
          amount: monthlyPrice,
          currency: "EGP",
          status,
          ...(status === "confirmed" ? { method: "vodafone_cash" as const } : {}),
          createdAt: timestampMonthsAgo(m),
          updatedAt: timestampMonthsAgo(m),
        });
        track(invCreated);
      }
    }

    console.log(
      `${authCreated ? "Created" : "Reused"} student — ${student.displayName} <${student.email}> password: ${DEFAULT_PASSWORD}  stage: ${student.stageId}  enrolled in ${coursesAtStage.length} course(s), subscribed to ${teachersAtStage.length} teacher(s)`,
    );
  }

  // 4. Recompute `systemStats/global` from the actual collections.
  //    This script (unlike `accountService`/`courseService`/etc.) writes
  //    docs directly with the Admin SDK, bypassing the increment calls
  //    those services make on every create — so without this step the
  //    Admin dashboard/analytics would show zeros no matter how much
  //    seed data exists. A full recount (not `FieldValue.increment`) so
  //    reruns stay correct even if some docs already existed.
  const [teachersCount, studentsCount, coursesCount, publishedCoursesCount, enrollmentsCount, lessonsCount] =
    await Promise.all([
      adminDb.collection("users").where("role", "==", "teacher").count().get(),
      adminDb.collection("users").where("role", "==", "student").count().get(),
      adminDb.collection("courses").count().get(),
      adminDb.collection("courses").where("status", "==", "published").count().get(),
      adminDb.collection("enrollments").count().get(),
      adminDb.collection("lessons").count().get(),
    ]);

  await adminDb.collection("systemStats").doc("global").set(
    {
      totalTeachers: teachersCount.data().count,
      totalStudents: studentsCount.data().count,
      totalCourses: coursesCount.data().count,
      totalPublishedCourses: publishedCoursesCount.data().count,
      totalEnrollments: enrollmentsCount.data().count,
      totalPublishedLessons: lessonsCount.data().count,
    },
    { merge: true },
  );
  console.log("systemStats/global recomputed from live collection counts.");

  console.log(`\nDone. ${created} documents created, ${reused} already existed (untouched).`);
  console.log("Log in at /en/login (or /ar/login) with any teacher/student email above.");
  console.log(
    `To test Phase 6 right away: log in as ${TEACHERS[0].email}, open the teacher dashboard schedule, and use "Send to all students" on the live slot — it should reach exactly the students enrolled at ${TEACHERS[0].stageIds[TEACHERS[0].liveSlotStageIndex ?? 0]}, not the teacher's students at other stages.`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
