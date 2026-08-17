/**
 * Full demo dataset — everything `seed-test-data.ts` creates (teachers,
 * students, courses, offerings, schedule, enrollments, subscriptions +
 * invoices) PLUS the pieces it deliberately left out:
 *
 *   - exactly one Admin account (`seed-dev-accounts.ts` gives you one,
 *     but this script is meant to be a single self-contained "give me
 *     everything to click through" run)
 *   - lessons under every course, each with a real YouTube video
 *     (`lessons.video.provider === "youtube"`)
 *   - one course-linked exam per course (a `quizzes` doc with
 *     `courseId` set) with a few multiple-choice/true-false questions
 *   - one standalone, stage-wide exam per stage (`quizzes` doc with no
 *     `courseId`, `stageId` + `scheduledAt` set instead — TASK-2101)
 *   - a handful of graded `quizAttempts` so exam results/analytics
 *     screens have real data too
 *
 * Intended to be run against an EMPTY project — pair it with
 * `npm run reset:all -- --yes-really-delete-everything` first if you
 * want a guaranteed-clean single copy of this dataset. It is still
 * idempotent on its own (deterministic ids, re-running only fills in
 * what's missing), it just won't clean up stray data from elsewhere.
 *
 * Usage:
 *   npm run seed:full-demo
 *   npm run seed:full-demo -- --reset-password   (reset all seeded passwords back to DevPass123!)
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

const RESET_PASSWORD = process.argv.includes("--reset-password");
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
// Reference data
// ---------------------------------------------------------------------

interface StageSeed {
  id: string;
  order: number;
  category: "nursery" | "primary" | "prep" | "secondary";
  name: { en: string; ar: string };
}

const STAGES: StageSeed[] = [
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
  { id: "subject-arabic", name: { en: "Arabic", ar: "لغة عربية" } },
  { id: "subject-english", name: { en: "English", ar: "لغة إنجليزية" } },
];

// A small pool of real, embeddable YouTube educational videos, reused
// round-robin across lessons so every lesson has a genuinely playable
// `video.url` instead of a placeholder.
const YOUTUBE_VIDEOS = [
  "https://www.youtube.com/watch?v=WUvTyaaNkzM", // Khan Academy - intro to algebra
  "https://www.youtube.com/watch?v=ZM8ECpBuQYE", // Khan Academy - Newton's laws
  "https://www.youtube.com/watch?v=FSyAehMdpyI", // Crash Course - intro chemistry
  "https://www.youtube.com/watch?v=rHux0gMZ3Eg", // Crash Course - grammar
  "https://www.youtube.com/watch?v=kd4FYFILNAY", // TED-Ed style science explainer
];

interface TeacherSeed {
  key: string;
  email: string;
  displayName: string;
  subjectId: string;
  stageIds: string[];
  lessonsPerCourse: number;
}

const TEACHERS: TeacherSeed[] = [
  {
    key: "teacher-math",
    email: "ahmed.math@dev.local",
    displayName: "Ahmed Hassan",
    subjectId: "subject-math",
    stageIds: ["stage-prep-1", "stage-prep-2", "stage-secondary-1"],
    lessonsPerCourse: 4,
  },
  {
    key: "teacher-physics",
    email: "mona.physics@dev.local",
    displayName: "Mona Youssef",
    subjectId: "subject-physics",
    stageIds: ["stage-secondary-1", "stage-secondary-2", "stage-secondary-3"],
    lessonsPerCourse: 5,
  },
  {
    key: "teacher-chemistry",
    email: "sara.chem@dev.local",
    displayName: "Sara Ibrahim",
    subjectId: "subject-chemistry",
    stageIds: ["stage-secondary-2", "stage-secondary-3"],
    lessonsPerCourse: 3,
  },
  {
    key: "teacher-arabic",
    email: "khaled.arabic@dev.local",
    displayName: "Khaled Adel",
    subjectId: "subject-arabic",
    stageIds: ["stage-primary-4", "stage-primary-5", "stage-prep-1"],
    lessonsPerCourse: 3,
  },
  {
    key: "teacher-english",
    email: "laila.english@dev.local",
    displayName: "Laila Fathy",
    subjectId: "subject-english",
    stageIds: ["stage-primary-4", "stage-primary-5", "stage-prep-2"],
    lessonsPerCourse: 4,
  },
];

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

const ADMIN = { email: "admin@dev.local", displayName: "Admin User" };

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

async function getOrCreateAuthUser(email: string, displayName: string): Promise<{ uid: string; created: boolean }> {
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

const courseId = (teacherUid: string, subjectId: string, stageId: string) => `course_${teacherUid}_${subjectId}_${stageId}`;
const offeringId = (teacherUid: string, subjectId: string, stageId: string) => `offering_${teacherUid}_${subjectId}_${stageId}`;
const scheduleId = (teacherUid: string, subjectId: string, stageId: string) => `slot_${teacherUid}_${subjectId}_${stageId}`;
const enrollmentId = (studentUid: string, course: string) => `${studentUid}_${course}`;
const subscriptionId = (studentUid: string, offering: string) => `sub_${studentUid}_${offering}`;
const invoiceId = (subId: string, period: string) => `inv_${subId}_${period}`;
const lessonId = (cId: string, index: number) => `lesson_${cId}_${index}`;
const courseExamId = (cId: string) => `exam_course_${cId}`;
const stageExamId = (sId: string) => `exam_stage_${sId}`;
const questionId = (quizId: string, index: number) => `q_${quizId}_${index}`;

function periodMonthsAgo(monthsAgo: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function timestampMonthsAgo(monthsAgo: number): number {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1)).getTime();
}

function timeMinutesAgo(minutesAgo: number): string {
  const t = new Date(Date.now() - minutesAgo * 60_000);
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}

function daysFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60_000;
}

/** Two MCQ questions + one true/false question, reused (with a course/stage-specific id) for every exam. */
function buildQuestionSet(teacherUid: string, quizId: string) {
  return [
    {
      id: questionId(quizId, 1),
      teacherId: teacherUid,
      quizId,
      type: "multiple_choice" as const,
      prompt: { en: "Which of the following is correct?", ar: "أي مما يلي صحيح؟" },
      options: [
        { id: "a", text: { en: "Option A", ar: "الخيار أ" } },
        { id: "b", text: { en: "Option B", ar: "الخيار ب" } },
        { id: "c", text: { en: "Option C", ar: "الخيار ج" } },
      ],
      correctOptionIds: ["b"],
    },
    {
      id: questionId(quizId, 2),
      teacherId: teacherUid,
      quizId,
      type: "multiple_choice" as const,
      prompt: { en: "Choose the best answer.", ar: "اختر الإجابة الأفضل." },
      options: [
        { id: "a", text: { en: "First", ar: "الأولى" } },
        { id: "b", text: { en: "Second", ar: "الثانية" } },
        { id: "c", text: { en: "Third", ar: "الثالثة" } },
      ],
      correctOptionIds: ["a"],
    },
    {
      id: questionId(quizId, 3),
      teacherId: teacherUid,
      quizId,
      type: "true_false" as const,
      prompt: { en: "This statement is true.", ar: "هذه العبارة صحيحة." },
      options: [
        { id: "true", text: { en: "True", ar: "صح" } },
        { id: "false", text: { en: "False", ar: "خطأ" } },
      ],
      correctOptionIds: ["true"],
    },
  ];
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------

async function main() {
  const now = Date.now();
  let created = 0;
  let reused = 0;
  const track = (wasCreated: boolean) => (wasCreated ? created++ : reused++);

  // 1. Admin account.
  const { uid: adminUid, created: adminAuthCreated } = await getOrCreateAuthUser(ADMIN.email, ADMIN.displayName);
  const { created: adminDocCreated } = await ensureDoc("users", adminUid, {
    uid: adminUid,
    email: ADMIN.email,
    displayName: ADMIN.displayName,
    role: "admin",
    createdBy: { uid: adminUid, role: "admin" },
    createdAt: now,
    updatedAt: now,
  });
  track(adminDocCreated);
  console.log(`${adminAuthCreated ? "Created" : "Reused"} admin — ${ADMIN.email} password: ${DEFAULT_PASSWORD}`);

  // 2. Reference data.
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

  let videoIndex = 0;

  // 3. Teachers: Auth + user doc + teacherProfile, then per stage they
  //    teach: course, lessons (YouTube videos), a course exam,
  //    offering, and a schedule slot (first stage's slot is "live now").
  const teacherUids: Record<string, string> = {};

  for (const [teacherIdx, teacher] of TEACHERS.entries()) {
    const { uid, created: authCreated } = await getOrCreateAuthUser(teacher.email, teacher.displayName);
    teacherUids[teacher.key] = uid;

    const { created: userCreated } = await ensureDoc("users", uid, {
      uid,
      email: teacher.email,
      displayName: teacher.displayName,
      role: "teacher",
      createdBy: { uid: adminUid, role: "admin" },
      createdAt: now,
      updatedAt: now,
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

    for (const [stageIdx, stageId] of teacher.stageIds.entries()) {
      const cId = courseId(uid, teacher.subjectId, stageId);
      const oId = offeringId(uid, teacher.subjectId, stageId);
      const sId = scheduleId(uid, teacher.subjectId, stageId);
      const isLiveSlot = stageIdx === 0;

      const lessonIds = Array.from({ length: teacher.lessonsPerCourse }, (_, i) => lessonId(cId, i + 1));

      const { created: courseCreated } = await ensureDoc("courses", cId, {
        teacherId: uid,
        subjectId: teacher.subjectId,
        stageId,
        slug: `${teacher.key}-${stageId}`,
        title: { en: `${teacher.displayName.split(" ")[0]}'s course`, ar: `كورس ${teacher.displayName}` },
        status: "published",
        lessonOrder: lessonIds,
        enrollmentType: "paid",
        price: 300,
        currency: "EGP",
        createdAt: now,
        updatedAt: now,
      });
      track(courseCreated);

      for (const [i, lId] of lessonIds.entries()) {
        const { created: lessonCreated } = await ensureDoc("lessons", lId, {
          teacherId: uid,
          courseId: cId,
          title: { en: `Lesson ${i + 1}`, ar: `الدرس ${i + 1}` },
          description: {
            en: `Lesson ${i + 1} of ${teacher.displayName}'s ${teacher.subjectId} course.`,
            ar: `الدرس ${i + 1} من كورس ${teacher.displayName}.`,
          },
          order: i + 1,
          video: {
            provider: "youtube",
            url: YOUTUBE_VIDEOS[videoIndex % YOUTUBE_VIDEOS.length],
          },
          fileIds: [],
          createdAt: now,
          updatedAt: now,
        });
        track(lessonCreated);
        videoIndex += 1;
      }

      // Course-linked exam.
      const cExamId = courseExamId(cId);
      const { created: examCreated } = await ensureDoc("quizzes", cExamId, {
        teacherId: uid,
        courseId: cId,
        lessonId: lessonIds[0],
        title: { en: "Course Exam", ar: "امتحان الكورس" },
        status: "published",
        questionIds: [1, 2, 3].map((i) => questionId(cExamId, i)),
        autoGrade: true,
        createdAt: now,
        updatedAt: now,
      });
      track(examCreated);
      if (examCreated) {
        for (const q of buildQuestionSet(uid, cExamId)) {
          const { created: qCreated } = await ensureDoc("questions", q.id, q);
          track(qCreated);
        }
      }

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
        dayOfWeek: isLiveSlot ? new Date().getDay() : (stageIdx + 1) % 7,
        startTime: isLiveSlot ? timeMinutesAgo(5) : "17:00",
        durationMinutes: 90,
        ...(isLiveSlot ? { meetingUrl: "https://meet.google.com/dev-test-link" } : {}),
        createdAt: now,
        updatedAt: now,
      });
      track(slotCreated);
    }

    console.log(
      `${authCreated ? "Created" : "Reused"} teacher — ${teacher.displayName} <${teacher.email}> password: ${DEFAULT_PASSWORD}  stages: ${teacher.stageIds.join(", ")}`,
    );
    void teacherIdx;
  }

  // 4. One standalone, stage-wide exam per stage (TASK-2101: no
  //    courseId, stageId + scheduledAt required instead), now that
  //    every teacher account exists. Owned by whichever teacher teaches
  //    that stage first, just so it has a valid teacherId.
  for (const stage of STAGES) {
    const owningTeacher = TEACHERS.find((t) => t.stageIds.includes(stage.id));
    if (!owningTeacher) continue;
    const teacherUid = teacherUids[owningTeacher.key];

    const sExamId = stageExamId(stage.id);
    const { created: examCreated } = await ensureDoc("quizzes", sExamId, {
      teacherId: teacherUid,
      title: { en: `${stage.name.en} — General Exam`, ar: `امتحان عام - ${stage.name.ar}` },
      status: "published",
      questionIds: [1, 2, 3].map((i) => questionId(sExamId, i)),
      stageId: stage.id,
      scheduledAt: daysFromNow(3),
      autoGrade: true,
      createdAt: now,
      updatedAt: now,
    });
    track(examCreated);

    if (examCreated) {
      for (const q of buildQuestionSet(teacherUid, sExamId)) {
        const { created: qCreated } = await ensureDoc("questions", q.id, q);
        track(qCreated);
      }
    }
  }
  console.log(`Standalone stage-wide exams ready (${STAGES.length}).`);

  // 5. Students: Auth + user doc, enroll in every course at their
  //    stage, subscribe to every teacher at their stage (with backfilled
  //    invoice history), and submit one graded attempt on their stage's
  //    standalone exam plus one course exam.
  for (const [studentIndex, student] of STUDENTS.entries()) {
    const { uid, created: authCreated } = await getOrCreateAuthUser(student.email, student.displayName);

    const { created: userCreated } = await ensureDoc("users", uid, {
      uid,
      email: student.email,
      displayName: student.displayName,
      role: "student",
      stageId: student.stageId,
      createdBy: { uid: adminUid, role: "admin" },
      createdAt: now,
      updatedAt: now,
    });
    track(userCreated);

    const teachersAtStage = TEACHERS.filter((teacher) => teacher.stageIds.includes(student.stageId));
    const coursesAtStage = teachersAtStage.map((teacher) => courseId(teacherUids[teacher.key], teacher.subjectId, student.stageId));

    let firstCourseExamId: string | null = null;
    let firstCourseTeacherUid: string | null = null;

    for (const cId of coursesAtStage) {
      const course = await adminDb.collection("courses").doc(cId).get();
      if (!course.exists) continue;
      const courseData = course.data()!;
      firstCourseExamId ??= courseExamId(cId);
      firstCourseTeacherUid ??= String(courseData.teacherId);

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

    for (const [teacherIndex, teacher] of teachersAtStage.entries()) {
      const teacherUid = teacherUids[teacher.key];
      const oId = offeringId(teacherUid, teacher.subjectId, student.stageId);
      const offering = await adminDb.collection("teacherOfferings").doc(oId).get();
      if (!offering.exists) continue;
      const monthlyPrice = Number(offering.data()!.monthlyPrice ?? 300);

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

    // One graded attempt on the stage-wide standalone exam.
    const sExamId = stageExamId(student.stageId);
    const stageExamOwner = teachersAtStage[0] ? teacherUids[teachersAtStage[0].key] : null;
    if (stageExamOwner) {
      const attemptId = `attempt_${uid}_${sExamId}`;
      const { created: attemptCreated } = await ensureDoc("quizAttempts", attemptId, {
        studentId: uid,
        quizId: sExamId,
        teacherId: stageExamOwner,
        answers: [
          { questionId: questionId(sExamId, 1), selectedOptionIds: ["b"] },
          { questionId: questionId(sExamId, 2), selectedOptionIds: ["a"] },
          { questionId: questionId(sExamId, 3), selectedOptionIds: [studentIndex % 3 === 0 ? "false" : "true"] },
        ],
        score: studentIndex % 3 === 0 ? 67 : 100,
        status: "graded",
        submittedAt: now,
      });
      track(attemptCreated);
    }

    // One graded attempt on the first course exam at this stage.
    if (firstCourseExamId && firstCourseTeacherUid) {
      const attemptId = `attempt_${uid}_${firstCourseExamId}`;
      const { created: attemptCreated } = await ensureDoc("quizAttempts", attemptId, {
        studentId: uid,
        quizId: firstCourseExamId,
        teacherId: firstCourseTeacherUid,
        answers: [
          { questionId: questionId(firstCourseExamId, 1), selectedOptionIds: ["b"] },
          { questionId: questionId(firstCourseExamId, 2), selectedOptionIds: ["a"] },
          { questionId: questionId(firstCourseExamId, 3), selectedOptionIds: ["true"] },
        ],
        score: 100,
        status: "graded",
        submittedAt: now,
      });
      track(attemptCreated);
    }

    console.log(
      `${authCreated ? "Created" : "Reused"} student — ${student.displayName} <${student.email}> password: ${DEFAULT_PASSWORD}  stage: ${student.stageId}  enrolled in ${coursesAtStage.length} course(s), subscribed to ${teachersAtStage.length} teacher(s)`,
    );
  }

  // 6. Recompute systemStats/global from live collection counts.
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
  console.log(`\nLog in at /en/login (or /ar/login):`);
  console.log(`  Admin:    ${ADMIN.email} / ${DEFAULT_PASSWORD}`);
  console.log(`  Teachers: ${TEACHERS.map((t) => t.email).join(", ")} / ${DEFAULT_PASSWORD}`);
  console.log(`  Students: ${STUDENTS.map((s) => s.email).join(", ")} / ${DEFAULT_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
