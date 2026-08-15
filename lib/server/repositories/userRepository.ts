import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";
import type { UserRole } from "@/lib/validation/auth.schema";

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
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
