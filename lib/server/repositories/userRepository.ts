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

  async create(user: UserDoc): Promise<void> {
    // `create()` (not `set()`) so this fails if the document already
    // exists, instead of silently overwriting a prior registration.
    await adminDb.collection(COLLECTION).doc(user.uid).create(user);
  },
};
