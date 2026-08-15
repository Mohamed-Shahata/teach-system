import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";

export interface TeacherProfileDoc {
  teacherId: string;
  displayName: string;
  isPublic: boolean;
  createdAt: number;
}

const COLLECTION = "teacherProfiles";

export const teacherProfileRepository = {
  async create(profile: TeacherProfileDoc): Promise<void> {
    await adminDb.collection(COLLECTION).doc(profile.teacherId).create(profile);
  },
};
