import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import type { UserRole } from "@/lib/validation/auth.schema";

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  /**
   * Who created this account — an Admin (any role) or a Teacher (student
   * accounts only), per `database/collections.md`. There is no
   * self-registration path (removed in TASK-605), so every account is
   * created via TASK-604's `accountService`, which always sets this.
   */
  createdBy: { uid: string; role: "admin" | "teacher" };
  /** ref into `educationStages` — required for students, optional otherwise. */
  stageId?: string;
  /** Contact number — used for manual-payment matching and general contact. */
  phone?: string;
  /** Student's age in years, if the admin/teacher recorded it at creation. */
  age?: number;
  /**
   * Mirrors the Firebase Auth account's `disabled` flag (TASK-1903/1904's
   * deactivate action). Kept here too — not just on the Auth user — so
   * admin list/detail views can render status without an extra
   * `adminAuth.getUser` round trip per row.
   */
  disabled?: boolean;
  /**
   * Teacher-only permission flag (Phase 5): whether this teacher may
   * create their own student accounts via `POST /api/teacher/students`
   * (`accountService.createStudentByTeacher`). Admin-toggleable per
   * teacher; absent/`undefined` is treated as `true` (every teacher can
   * create students by default, matching pre-Phase-5 behavior) so
   * existing teacher docs don't need a migration.
   */
  canCreateStudents?: boolean;
  /** Cloudinary delivery URL for the user's profile picture, if set (any role). */
  avatarUrl?: string;
  /** Cloudinary `public_id` backing `avatarUrl` — needed to destroy the old asset when it's replaced. */
  avatarPublicId?: string;
  createdAt: number;
}

const COLLECTION = "users";

export const userRepository = {
  async findById(uid: string): Promise<UserDoc | null> {
    const snap = await adminDb.collection(COLLECTION).doc(uid).get();
    return snap.exists ? (snap.data() as UserDoc) : null;
  },

  /**
   * Bulk lookup for joining a set of uids to their `users` docs (e.g. the
   * teacher's student list, TASK-1002, joining `enrollments.studentId` to
   * name/email). Firestore's `in` operator caps at 30 values per query, so
   * this chunks; duplicate/unknown ids are simply absent from the result
   * map rather than erroring, since a stale `studentId` on an enrollment
   * shouldn't break the whole list.
   */
  async findByIds(uids: string[]): Promise<Map<string, UserDoc>> {
    const unique = Array.from(new Set(uids));
    const result = new Map<string, UserDoc>();
    const CHUNK = 30;

    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      if (chunk.length === 0) continue;
      const snap = await adminDb.collection(COLLECTION).where("__name__", "in", chunk).get();
      for (const doc of snap.docs) {
        result.set(doc.id, doc.data() as UserDoc);
      }
    }

    return result;
  },

  /**
   * Looks up a user by their `phone` field -- used by the login-by-phone
   * flow (`/api/auth/resolve-login`) to translate a phone number into the
   * account's email before handing off to Firebase Auth's email/password
   * sign-in, since Firebase Auth itself has no phone/password method.
   * Equality filter on a single field, so no composite index is needed.
   * Returns `null` if zero or more than one match (an unset/duplicate
   * phone shouldn't silently authenticate as the wrong account).
   */
  async findByPhone(phone: string): Promise<UserDoc | null> {
    const snap = await adminDb.collection(COLLECTION).where("phone", "==", phone).limit(2).get();
    if (snap.size !== 1) return null;
    return snap.docs[0].data() as UserDoc;
  },

  async create(user: UserDoc): Promise<void> {
    // `create()` (not `set()`) so this fails if the document already
    // exists, instead of silently overwriting a prior registration.
    await adminDb.collection(COLLECTION).doc(user.uid).create(user);
  },

  /**
   * All users of a given role — TASK-1903/1904's center-wide Teacher/
   * Student management lists. `search` does a client-side substring match
   * on `displayName`/`email` (Firestore has no native contains query, and
   * the center's user count doesn't justify a search index for the MVP).
   */
  async listByRole(role: UserRole, search?: string): Promise<UserDoc[]> {
    const snap = await adminDb.collection(COLLECTION).where("role", "==", role).get();
    let users = snap.docs.map((doc) => doc.data() as UserDoc);
    if (search) {
      const needle = search.trim().toLowerCase();
      if (needle) {
        users = users.filter(
          (user) =>
            user.displayName.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle),
        );
      }
    }
    return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
  },

  /** Mirrors a Firebase Auth `disabled` flag change onto the `users` doc. */
  async setDisabled(uid: string, disabled: boolean): Promise<void> {
    await adminDb.collection(COLLECTION).doc(uid).update({ disabled });
  },

  /** Admin-set teacher permission flag — see `UserDoc.canCreateStudents`. */
  async setCanCreateStudents(uid: string, canCreateStudents: boolean): Promise<void> {
    await adminDb.collection(COLLECTION).doc(uid).update({ canCreateStudents });
  },

  /**
   * Admin edit of an existing account's profile fields (name/email/phone/
   * age/grade level) — the Teacher/Student management "Edit" action.
   * Only defined keys are written, so partial edits never clobber fields
   * the admin didn't touch. Callers are responsible for also updating the
   * Firebase Auth account's `displayName`/`email` (`adminAuth.updateUser`)
   * so the two stay in sync, the same dual-write pattern `setDisabled` uses.
   */
  async updateProfile(
    uid: string,
    fields: Partial<Pick<UserDoc, "displayName" | "email" | "phone" | "age" | "stageId">>,
  ): Promise<void> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) data[key] = value;
    }
    if (Object.keys(data).length === 0) return;
    await adminDb.collection(COLLECTION).doc(uid).update(data);
  },

  /**
   * Updates a user's own `displayName` — TASK-1907's Admin account
   * settings (and reusable by any future self-service profile edit).
   * Callers are responsible for also updating the Firebase Auth
   * account's `displayName` (`adminAuth.updateUser`) so the two stay in
   * sync, the same dual-write pattern `setDisabled` uses.
   */
  async updateDisplayName(uid: string, displayName: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(uid).update({ displayName });
  },

  /**
   * Updates a user's own profile picture (any role — TASK-1005's student
   * settings, reusable for the equivalent teacher/admin settings later).
   * Callers are responsible for destroying the previous `avatarPublicId`
   * on Cloudinary first if one existed, same compound-operation ordering
   * as course thumbnail/file replacement (`security/error-handling.md`).
   */
  async updateAvatar(uid: string, avatarUrl: string, avatarPublicId: string): Promise<void> {
    await adminDb.collection(COLLECTION).doc(uid).update({ avatarUrl, avatarPublicId });
  },
};
