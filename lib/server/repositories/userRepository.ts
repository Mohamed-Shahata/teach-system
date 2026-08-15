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

  async create(user: UserDoc): Promise<void> {
    // `create()` (not `set()`) so this fails if the document already
    // exists, instead of silently overwriting a prior registration.
    await adminDb.collection(COLLECTION).doc(user.uid).create(user);
  },
};
