/**
 * TASK-1603 — Firestore Security Rules tests.
 *
 * Emulator-based allow/deny tests per collection, exercising the rules in
 * `firestore.rules` (TASK-601 + TASK-1501) directly against a real
 * `rules_version = '2'` engine — the thing the plain Vitest unit suite
 * cannot do, since it never loads the rules file at all.
 *
 * Requires the Firestore emulator running locally (see docs/firebase/README.md):
 *   firebase emulators:start --only firestore
 * then, in a second terminal:
 *   npx vitest run test/firestore.rules.test.ts
 *
 * Not part of `npm test` — no emulator is reachable in CI/sandbox yet
 * (same limitation documented on TASK-601/1501/1503), so this file is run
 * manually / wired into CI separately once that's available.
 */
import { afterAll, beforeAll, beforeEach, describe, test } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import path from "node:path";

let testEnv: RulesTestEnvironment;

const ADMIN_UID = "admin-1";
const TEACHER_UID = "teacher-1";
const OTHER_TEACHER_UID = "teacher-2";
const STUDENT_UID = "student-1";
const OTHER_STUDENT_UID = "student-2";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "teach-system-rules-test",
    firestore: {
      rules: readFileSync(path.resolve(import.meta.dirname, "../firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed the users/{uid} role docs every rule's callerRole() depends on,
  // and one row of baseline data per collection under test, using the
  // Admin SDK context (bypasses rules entirely, same as the app's own
  // server-side writes).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`users/${ADMIN_UID}`).set({ role: "admin", createdBy: "system" });
    await db.doc(`users/${TEACHER_UID}`).set({ role: "teacher", createdBy: ADMIN_UID });
    await db.doc(`users/${OTHER_TEACHER_UID}`).set({ role: "teacher", createdBy: ADMIN_UID });
    await db.doc(`users/${STUDENT_UID}`).set({ role: "student", createdBy: ADMIN_UID });
    await db.doc(`users/${OTHER_STUDENT_UID}`).set({ role: "student", createdBy: ADMIN_UID });

    await db.doc("courses/course-1").set({
      teacherId: TEACHER_UID,
      status: "published",
    });
    await db.doc("courses/course-2").set({
      teacherId: TEACHER_UID,
      status: "draft",
    });

    await db.doc(`enrollments/${STUDENT_UID}_course-1`).set({
      studentId: STUDENT_UID,
      courseId: "course-1",
      teacherId: TEACHER_UID,
      status: "active",
      progress: 0,
    });

    await db.doc("lessons/lesson-1").set({
      teacherId: TEACHER_UID,
      courseId: "course-1",
    });

    await db.doc("payments/payment-1").set({
      studentId: STUDENT_UID,
      teacherId: TEACHER_UID,
      courseId: "course-1",
      status: "pending",
      method: "vodafone_cash",
      amount: 500,
    });

    await db.doc("quizzes/quiz-1").set({
      teacherId: TEACHER_UID,
      status: "published",
    });

    await db.doc("questions/question-1").set({
      teacherId: TEACHER_UID,
      quizId: "quiz-1",
      correctOptionIds: ["a"],
    });

    await db.doc("quizAttempts/attempt-1").set({
      studentId: STUDENT_UID,
      teacherId: TEACHER_UID,
      quizId: "quiz-1",
      status: "pending_review",
      score: 0,
      answers: {},
    });

    await db.doc("files/file-1").set({ teacherId: TEACHER_UID });

    await db.doc(`teacherProfiles/${TEACHER_UID}`).set({
      teacherId: TEACHER_UID,
      isPublic: true,
    });
    await db.doc(`teacherProfiles/${OTHER_TEACHER_UID}`).set({
      teacherId: OTHER_TEACHER_UID,
      isPublic: false,
    });

    await db.doc("schedule/slot-1").set({ teacherId: TEACHER_UID });

    await db.doc(`reviews/${TEACHER_UID}_${STUDENT_UID}`).set({
      teacherId: TEACHER_UID,
      studentId: STUDENT_UID,
      rating: 5,
      comment: "great teacher",
      hidden: false,
    });
    await db.doc(`reviews/${TEACHER_UID}_${OTHER_STUDENT_UID}`).set({
      teacherId: TEACHER_UID,
      studentId: OTHER_STUDENT_UID,
      rating: 3,
      comment: "original",
      hidden: true,
    });

    await db.doc(`lessonProgress/${STUDENT_UID}_lesson-1`).set({
      studentId: STUDENT_UID,
      lessonId: "lesson-1",
      watchedSeconds: 10,
    });

    await db.doc("notifications/notif-1").set({
      recipientId: STUDENT_UID,
      teacherId: TEACHER_UID,
      scheduleId: "slot-1",
      meetingUrl: "https://example.com",
      read: false,
    });

    await db.doc("teacherOfferings/offering-1").set({
      teacherId: TEACHER_UID,
      subjectId: "subject-1",
      stageId: "stage-1",
      monthlyPrice: 300,
    });

    await db.doc("subscriptions/sub-1").set({
      studentId: STUDENT_UID,
      teacherId: TEACHER_UID,
      offeringId: "offering-1",
      subjectId: "subject-1",
      stageId: "stage-1",
      status: "active",
    });

    await db.doc("subscriptionInvoices/invoice-1").set({
      subscriptionId: "sub-1",
      studentId: STUDENT_UID,
      teacherId: TEACHER_UID,
      offeringId: "offering-1",
      period: "2026-08",
      amount: 300,
      currency: "EGP",
      status: "pending",
    });
  });
});

function asAdmin() {
  return testEnv.authenticatedContext(ADMIN_UID).firestore();
}
function asTeacher() {
  return testEnv.authenticatedContext(TEACHER_UID).firestore();
}
function asOtherTeacher() {
  return testEnv.authenticatedContext(OTHER_TEACHER_UID).firestore();
}
function asStudent() {
  return testEnv.authenticatedContext(STUDENT_UID).firestore();
}
function asOtherStudent() {
  return testEnv.authenticatedContext(OTHER_STUDENT_UID).firestore();
}
function unauth() {
  return testEnv.unauthenticatedContext().firestore();
}

describe("users/{uid}", () => {
  test("a user can read their own doc", async () => {
    await assertSucceeds(asStudent().doc(`users/${STUDENT_UID}`).get());
  });

  test("a user cannot read another user's doc", async () => {
    await assertFails(asStudent().doc(`users/${TEACHER_UID}`).get());
  });

  test("admin can read any user doc", async () => {
    await assertSucceeds(asAdmin().doc(`users/${STUDENT_UID}`).get());
  });

  test("client-side create is always denied (server-provisioned only)", async () => {
    await assertFails(asAdmin().doc("users/new-uid").set({ role: "student", createdBy: ADMIN_UID }));
  });

  test("a user cannot change their own role via update", async () => {
    await assertFails(
      asStudent().doc(`users/${STUDENT_UID}`).set({ role: "admin", createdBy: ADMIN_UID }),
    );
  });
});

describe("courses/{courseId}", () => {
  test("anyone can read a published course", async () => {
    await assertSucceeds(unauth().doc("courses/course-1").get());
  });

  test("a non-owner cannot read a draft course", async () => {
    await assertFails(asOtherTeacher().doc("courses/course-2").get());
  });

  test("the owning teacher can read their own draft course", async () => {
    await assertSucceeds(asTeacher().doc("courses/course-2").get());
  });

  test("a teacher can create a course they own", async () => {
    await assertSucceeds(
      asTeacher().doc("courses/course-new").set({ teacherId: TEACHER_UID, status: "draft" }),
    );
  });

  test("a teacher cannot create a course owned by someone else", async () => {
    await assertFails(
      asTeacher().doc("courses/course-new").set({ teacherId: OTHER_TEACHER_UID, status: "draft" }),
    );
  });

  test("a teacher cannot update another teacher's course", async () => {
    await assertFails(
      asOtherTeacher().doc("courses/course-1").set({ teacherId: TEACHER_UID, status: "draft" }),
    );
  });

  test("a teacher cannot reassign teacherId on update", async () => {
    await assertFails(
      asTeacher().doc("courses/course-1").set({ teacherId: OTHER_TEACHER_UID, status: "published" }),
    );
  });
});

describe("lessons/{lessonId}", () => {
  test("the owning teacher can read the lesson", async () => {
    await assertSucceeds(asTeacher().doc("lessons/lesson-1").get());
  });

  test("an enrolled student can read the lesson", async () => {
    await assertSucceeds(asStudent().doc("lessons/lesson-1").get());
  });

  test("a non-enrolled student cannot read the lesson", async () => {
    await assertFails(asOtherStudent().doc("lessons/lesson-1").get());
  });

  test("a non-owning teacher cannot read the lesson", async () => {
    await assertFails(asOtherTeacher().doc("lessons/lesson-1").get());
  });
});

describe("enrollments/{enrollmentId}", () => {
  test("the enrolled student can read their own enrollment", async () => {
    await assertSucceeds(asStudent().doc(`enrollments/${STUDENT_UID}_course-1`).get());
  });

  test("a different student cannot read someone else's enrollment", async () => {
    await assertFails(asOtherStudent().doc(`enrollments/${STUDENT_UID}_course-1`).get());
  });

  test("client-side create is always denied (server state-machine only)", async () => {
    await assertFails(
      asStudent().doc(`enrollments/${STUDENT_UID}_course-2`).set({
        studentId: STUDENT_UID,
        courseId: "course-2",
        teacherId: TEACHER_UID,
        status: "active",
        progress: 0,
      }),
    );
  });

  test("a student can update their own progress field", async () => {
    await assertSucceeds(
      asStudent().doc(`enrollments/${STUDENT_UID}_course-1`).set({
        studentId: STUDENT_UID,
        courseId: "course-1",
        teacherId: TEACHER_UID,
        status: "active",
        progress: 50,
      }),
    );
  });

  test("a student cannot change their enrollment status", async () => {
    await assertFails(
      asStudent().doc(`enrollments/${STUDENT_UID}_course-1`).set({
        studentId: STUDENT_UID,
        courseId: "course-1",
        teacherId: TEACHER_UID,
        status: "cancelled",
        progress: 0,
      }),
    );
  });
});

describe("payments/{paymentId}", () => {
  test("a student can create their own pending manual payment", async () => {
    await assertSucceeds(
      asStudent().doc("payments/payment-new").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        courseId: "course-1",
        status: "pending",
        method: "bank_transfer",
        amount: 300,
      }),
    );
  });

  test("a student cannot self-create an already-confirmed payment", async () => {
    await assertFails(
      asStudent().doc("payments/payment-new").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        courseId: "course-1",
        status: "confirmed",
        method: "bank_transfer",
        amount: 300,
      }),
    );
  });

  test("a student cannot self-create an online-gateway payment", async () => {
    await assertFails(
      asStudent().doc("payments/payment-new").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        courseId: "course-1",
        status: "pending",
        method: "card",
        amount: 300,
      }),
    );
  });

  test("the owning teacher can confirm a pending payment", async () => {
    await assertSucceeds(
      asTeacher().doc("payments/payment-1").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        courseId: "course-1",
        status: "confirmed",
        method: "vodafone_cash",
        amount: 500,
      }),
    );
  });

  test("a non-owning teacher cannot confirm the payment", async () => {
    await assertFails(
      asOtherTeacher().doc("payments/payment-1").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        courseId: "course-1",
        status: "confirmed",
        method: "vodafone_cash",
        amount: 500,
      }),
    );
  });
});

describe("quizzes/{quizId} and questions/{questionId}", () => {
  test("any signed-in student can read a published quiz", async () => {
    await assertSucceeds(asStudent().doc("quizzes/quiz-1").get());
  });

  test("an unauthenticated user cannot read a quiz", async () => {
    await assertFails(unauth().doc("quizzes/quiz-1").get());
  });

  test("a student cannot read a question (correctOptionIds must stay hidden)", async () => {
    await assertFails(asStudent().doc("questions/question-1").get());
  });

  test("the owning teacher can read the question", async () => {
    await assertSucceeds(asTeacher().doc("questions/question-1").get());
  });
});

describe("quizAttempts/{attemptId}", () => {
  test("a student can create their own attempt with score 0", async () => {
    await assertSucceeds(
      asStudent().doc("quizAttempts/attempt-new").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        quizId: "quiz-1",
        status: "pending_review",
        score: 0,
        answers: {},
      }),
    );
  });

  test("a student cannot self-report a non-zero score", async () => {
    await assertFails(
      asStudent().doc("quizAttempts/attempt-new").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        quizId: "quiz-1",
        status: "graded",
        score: 100,
        answers: {},
      }),
    );
  });

  test("the owning teacher can grade a pending_review attempt", async () => {
    await assertSucceeds(
      asTeacher().doc("quizAttempts/attempt-1").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        quizId: "quiz-1",
        status: "graded",
        score: 8,
        answers: {},
      }),
    );
  });

  test("a student cannot grade their own attempt", async () => {
    await assertFails(
      asStudent().doc("quizAttempts/attempt-1").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        quizId: "quiz-1",
        status: "graded",
        score: 10,
        answers: {},
      }),
    );
  });
});

describe("files/{fileId}", () => {
  test("the owning teacher can read their file", async () => {
    await assertSucceeds(asTeacher().doc("files/file-1").get());
  });

  test("a student has no read path on files", async () => {
    await assertFails(asStudent().doc("files/file-1").get());
  });

  test("a non-owning teacher cannot read the file", async () => {
    await assertFails(asOtherTeacher().doc("files/file-1").get());
  });
});

describe("teacherProfiles/{teacherId}", () => {
  test("anyone can read a public teacher profile", async () => {
    await assertSucceeds(unauth().doc(`teacherProfiles/${TEACHER_UID}`).get());
  });

  test("a non-owner cannot read a private teacher profile", async () => {
    await assertFails(asTeacher().doc(`teacherProfiles/${OTHER_TEACHER_UID}`).get());
  });

  test("the owner can read their own private profile", async () => {
    await assertSucceeds(asOtherTeacher().doc(`teacherProfiles/${OTHER_TEACHER_UID}`).get());
  });

  test("a teacher can create their own profile", async () => {
    await assertSucceeds(
      asOtherTeacher().doc(`teacherProfiles/${OTHER_TEACHER_UID}`).set({
        teacherId: OTHER_TEACHER_UID,
        isPublic: false,
      }),
    );
  });

  test("a teacher cannot create a profile for someone else", async () => {
    await assertFails(
      asTeacher().doc(`teacherProfiles/${OTHER_TEACHER_UID}`).set({
        teacherId: OTHER_TEACHER_UID,
        isPublic: false,
      }),
    );
  });
});

describe("schedule/{scheduleId}", () => {
  test("anyone can read schedule slots", async () => {
    await assertSucceeds(unauth().doc("schedule/slot-1").get());
  });

  test("a teacher can create their own schedule slot", async () => {
    await assertSucceeds(
      asTeacher().doc("schedule/slot-new").set({ teacherId: TEACHER_UID }),
    );
  });

  test("a teacher cannot create a slot owned by someone else", async () => {
    await assertFails(
      asTeacher().doc("schedule/slot-new").set({ teacherId: OTHER_TEACHER_UID }),
    );
  });

  test("a non-owning teacher cannot update the slot", async () => {
    await assertFails(
      asOtherTeacher().doc("schedule/slot-1").set({ teacherId: TEACHER_UID }),
    );
  });
});

describe("reviews/{teacherId_studentId}", () => {
  test("a visible review is publicly readable", async () => {
    await assertSucceeds(unauth().doc(`reviews/${TEACHER_UID}_${STUDENT_UID}`).get());
  });

  test("a hidden review is not publicly readable", async () => {
    await assertFails(unauth().doc(`reviews/${TEACHER_UID}_${OTHER_STUDENT_UID}`).get());
  });

  test("the reviewed teacher can read a hidden review about them", async () => {
    await assertSucceeds(asTeacher().doc(`reviews/${TEACHER_UID}_${OTHER_STUDENT_UID}`).get());
  });

  test("a student can create a review for a teacher with rating 1-5", async () => {
    await assertSucceeds(
      asOtherStudent().doc(`reviews/${OTHER_TEACHER_UID}_${OTHER_STUDENT_UID}`).set({
        teacherId: OTHER_TEACHER_UID,
        studentId: OTHER_STUDENT_UID,
        rating: 4,
        comment: "great",
        hidden: false,
      }),
    );
  });

  test("a student cannot create a review with an out-of-range rating", async () => {
    await assertFails(
      asOtherStudent().doc(`reviews/${OTHER_TEACHER_UID}_${OTHER_STUDENT_UID}`).set({
        teacherId: OTHER_TEACHER_UID,
        studentId: OTHER_STUDENT_UID,
        rating: 6,
        comment: "great",
        hidden: false,
      }),
    );
  });

  test("a student cannot set hidden=true on their own review at creation", async () => {
    await assertFails(
      asOtherStudent().doc(`reviews/${OTHER_TEACHER_UID}_${OTHER_STUDENT_UID}`).set({
        teacherId: OTHER_TEACHER_UID,
        studentId: OTHER_STUDENT_UID,
        rating: 4,
        comment: "great",
        hidden: true,
      }),
    );
  });

  test("a student cannot flip hidden on their own review via update", async () => {
    await assertFails(
      asStudent().doc(`reviews/${TEACHER_UID}_${STUDENT_UID}`).set({
        teacherId: TEACHER_UID,
        studentId: STUDENT_UID,
        rating: 5,
        comment: "great teacher",
        hidden: true,
      }),
    );
  });

  test("admin can hide a review without changing rating/comment", async () => {
    await assertSucceeds(
      asAdmin().doc(`reviews/${TEACHER_UID}_${OTHER_STUDENT_UID}`).set({
        teacherId: TEACHER_UID,
        studentId: OTHER_STUDENT_UID,
        rating: 3,
        comment: "original",
        hidden: true,
      }),
    );
  });
});

describe("lessonProgress/{studentId_lessonId}", () => {
  test("the owning student can read their own progress", async () => {
    await assertSucceeds(asStudent().doc(`lessonProgress/${STUDENT_UID}_lesson-1`).get());
  });

  test("a different student cannot read someone else's progress", async () => {
    await assertFails(asOtherStudent().doc(`lessonProgress/${STUDENT_UID}_lesson-1`).get());
  });

  test("a student can create their own progress doc with matching id", async () => {
    await assertSucceeds(
      asStudent().doc(`lessonProgress/${STUDENT_UID}_lesson-1`).set({
        studentId: STUDENT_UID,
        lessonId: "lesson-1",
        watchedSeconds: 30,
      }),
    );
  });

  test("a student cannot create a progress doc for someone else", async () => {
    await assertFails(
      asOtherStudent().doc(`lessonProgress/${STUDENT_UID}_lesson-1`).set({
        studentId: STUDENT_UID,
        lessonId: "lesson-1",
        watchedSeconds: 30,
      }),
    );
  });
});

describe("notifications/{notificationId}", () => {
  test("the recipient can read their own notification", async () => {
    await assertSucceeds(asStudent().doc("notifications/notif-1").get());
  });

  test("a non-recipient cannot read the notification", async () => {
    await assertFails(asOtherStudent().doc("notifications/notif-1").get());
  });

  test("client-side create is always denied (server-created only)", async () => {
    await assertFails(
      asStudent().doc("notifications/notif-new").set({
        recipientId: STUDENT_UID,
        teacherId: TEACHER_UID,
        scheduleId: "slot-1",
        meetingUrl: "https://example.com",
        read: false,
      }),
    );
  });

  test("the recipient can mark their own notification read", async () => {
    await assertSucceeds(
      asStudent().doc("notifications/notif-1").set({
        recipientId: STUDENT_UID,
        teacherId: TEACHER_UID,
        scheduleId: "slot-1",
        meetingUrl: "https://example.com",
        read: true,
      }),
    );
  });

  test("the recipient cannot change the meetingUrl while marking read", async () => {
    await assertFails(
      asStudent().doc("notifications/notif-1").set({
        recipientId: STUDENT_UID,
        teacherId: TEACHER_UID,
        scheduleId: "slot-1",
        meetingUrl: "https://tampered.example.com",
        read: true,
      }),
    );
  });
});

describe("teacherOfferings/{offeringId}", () => {
  test("the owning teacher can read their own offering", async () => {
    await assertSucceeds(asTeacher().doc("teacherOfferings/offering-1").get());
  });

  test("a different teacher cannot read someone else's offering", async () => {
    await assertFails(asOtherTeacher().doc("teacherOfferings/offering-1").get());
  });

  test("admin can create an offering", async () => {
    await assertSucceeds(
      asAdmin().doc("teacherOfferings/offering-new").set({
        teacherId: TEACHER_UID,
        subjectId: "subject-1",
        stageId: "stage-1",
        monthlyPrice: 400,
      }),
    );
  });

  test("a teacher cannot write their own offering directly", async () => {
    await assertFails(
      asTeacher().doc("teacherOfferings/offering-1").set({
        teacherId: TEACHER_UID,
        subjectId: "subject-1",
        stageId: "stage-1",
        monthlyPrice: 999,
      }),
    );
  });
});

describe("subscriptions/{subscriptionId}", () => {
  test("the subscribed student can read their own subscription", async () => {
    await assertSucceeds(asStudent().doc("subscriptions/sub-1").get());
  });

  test("the owning teacher can read the subscription", async () => {
    await assertSucceeds(asTeacher().doc("subscriptions/sub-1").get());
  });

  test("a different student cannot read someone else's subscription", async () => {
    await assertFails(asOtherStudent().doc("subscriptions/sub-1").get());
  });

  test("a student cannot create their own subscription", async () => {
    await assertFails(
      asStudent().doc("subscriptions/sub-new").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        offeringId: "offering-1",
        subjectId: "subject-1",
        stageId: "stage-1",
        status: "active",
      }),
    );
  });

  test("admin can create a subscription", async () => {
    await assertSucceeds(
      asAdmin().doc("subscriptions/sub-new").set({
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        offeringId: "offering-1",
        subjectId: "subject-1",
        stageId: "stage-1",
        status: "active",
      }),
    );
  });
});

describe("subscriptionInvoices/{invoiceId}", () => {
  test("the billed student can read their own invoice", async () => {
    await assertSucceeds(asStudent().doc("subscriptionInvoices/invoice-1").get());
  });

  test("the owning teacher can read the invoice", async () => {
    await assertSucceeds(asTeacher().doc("subscriptionInvoices/invoice-1").get());
  });

  test("a different student cannot read someone else's invoice", async () => {
    await assertFails(asOtherStudent().doc("subscriptionInvoices/invoice-1").get());
  });

  test("a student cannot confirm their own invoice", async () => {
    await assertFails(
      asStudent().doc("subscriptionInvoices/invoice-1").set({
        subscriptionId: "sub-1",
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        offeringId: "offering-1",
        period: "2026-08",
        amount: 300,
        currency: "EGP",
        status: "confirmed",
      }),
    );
  });

  test("admin can review (confirm) an invoice", async () => {
    await assertSucceeds(
      asAdmin().doc("subscriptionInvoices/invoice-1").set({
        subscriptionId: "sub-1",
        studentId: STUDENT_UID,
        teacherId: TEACHER_UID,
        offeringId: "offering-1",
        period: "2026-08",
        amount: 300,
        currency: "EGP",
        status: "confirmed",
      }),
    );
  });
});
