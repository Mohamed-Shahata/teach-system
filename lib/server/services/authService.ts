import "server-only";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { teacherProfileRepository } from "@/lib/server/repositories/teacherProfileRepository";
import { ConflictError, UnauthorizedError } from "@/lib/errors";
import type { RegisterInput } from "@/lib/validation/auth.schema";

export interface RegisteredUser {
  uid: string;
  email: string;
  displayName: string;
  role: RegisterInput["role"];
}

export const authService = {
  /**
   * Verifies the Firebase ID token proving the caller owns the newly
   * created Auth account, then creates `users/{uid}` (and
   * `teacherProfiles/{uid}` for teachers). `role` is the client's stated
   * *registration intent* but is only ever trusted here, at account
   * creation — it is written once and is immutable afterward (enforced by
   * Firestore rules on `users/{uid}` updates, see docs/firebase/README.md).
   */
  async registerUser(input: RegisterInput): Promise<RegisteredUser> {
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(input.idToken);
    } catch {
      throw new UnauthorizedError("errors.unauthorized");
    }

    const { uid, email } = decoded;
    if (!email) {
      // Email/password is the only MVP provider, so a verified token
      // without an email indicates something is structurally wrong;
      // treat it the same as an invalid token rather than proceeding.
      throw new UnauthorizedError("errors.unauthorized");
    }

    const existing = await userRepository.findById(uid);
    if (existing) {
      throw new ConflictError("auth.register.errors.emailInUse");
    }

    const createdAt = Date.now();

    try {
      await userRepository.create({
        uid,
        email,
        displayName: input.displayName,
        role: input.role,
        createdAt,
      });
    } catch {
      // create() rejects if the doc already exists — a race with another
      // concurrent registration request for the same uid.
      throw new ConflictError("auth.register.errors.emailInUse");
    }

    if (input.role === "teacher") {
      await teacherProfileRepository.create({
        teacherId: uid,
        displayName: input.displayName,
        isPublic: false,
        createdAt,
      });
    }

    return { uid, email, displayName: input.displayName, role: input.role };
  },
};
