import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { educationStageRepository } from "@/lib/server/repositories/educationStageRepository";
import { subjectRepository } from "@/lib/server/repositories/subjectRepository";
import type {
  CreateEducationStageInput,
  UpdateEducationStageInput,
  CreateSubjectInput,
  UpdateSubjectInput,
} from "@/lib/validation/centerConfig.schema";

/**
 * TASK-1905 — Education stages & subjects management.
 *
 * `educationStages`/`subjects` are center-wide lookup collections (no
 * `teacherId`, see `database/collections.md`), previously seed-script-only.
 * Reads are open to any authenticated role (a teacher's course form and a
 * student's browse/filter UI both need the list); writes are Admin-only,
 * enforced here with `assertRole(session, "admin")` rather than the
 * teacher-ownership guards in `base.ts`/`guards.ts`, since there is no
 * owning teacher to check against.
 */
export const centerConfigService = {
  async listEducationStages(session: Session) {
    assertRole(session, "admin", "teacher", "student");
    return educationStageRepository.list();
  },

  async createEducationStage(session: Session, input: CreateEducationStageInput) {
    assertRole(session, "admin");
    return educationStageRepository.create(input);
  },

  async updateEducationStage(session: Session, id: string, input: UpdateEducationStageInput) {
    assertRole(session, "admin");
    return educationStageRepository.update(id, input);
  },

  async deleteEducationStage(session: Session, id: string) {
    assertRole(session, "admin");
    return educationStageRepository.delete(id);
  },

  async listSubjects(session: Session) {
    assertRole(session, "admin", "teacher", "student");
    return subjectRepository.list();
  },

  async createSubject(session: Session, input: CreateSubjectInput) {
    assertRole(session, "admin");
    const now = Date.now();
    return subjectRepository.create({ name: input.name, createdAt: now });
  },

  async updateSubject(session: Session, id: string, input: UpdateSubjectInput) {
    assertRole(session, "admin");
    return subjectRepository.update(id, input);
  },

  async deleteSubject(session: Session, id: string) {
    assertRole(session, "admin");
    return subjectRepository.delete(id);
  },
};
