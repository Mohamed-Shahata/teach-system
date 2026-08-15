import { beforeEach, describe, expect, it, vi } from "vitest";

const stageList = vi.fn();
const stageCreate = vi.fn();
const stageUpdate = vi.fn();
const stageDelete = vi.fn();

const subjectList = vi.fn();
const subjectCreate = vi.fn();
const subjectUpdate = vi.fn();
const subjectDelete = vi.fn();

vi.mock("@/lib/server/repositories/educationStageRepository", () => ({
  educationStageRepository: {
    list: stageList,
    create: stageCreate,
    update: stageUpdate,
    delete: stageDelete,
  },
}));

vi.mock("@/lib/server/repositories/subjectRepository", () => ({
  subjectRepository: {
    list: subjectList,
    create: subjectCreate,
    update: subjectUpdate,
    delete: subjectDelete,
  },
}));

const { centerConfigService } = await import("./centerConfigService");
const { ForbiddenError } = await import("@/lib/errors");

function makeSession(role: "admin" | "teacher" | "student", uid = "user-1") {
  return { uid, email: `${uid}@example.com`, role };
}

const stageInput = { name: { en: "Grade 3 Secondary", ar: "3 ثانوي" }, category: "secondary" as const, order: 12 };
const subjectInput = { name: { en: "Physics", ar: "فيزياء" } };

describe("centerConfigService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stageList.mockResolvedValue([]);
    stageCreate.mockImplementation(async (doc) => ({ id: "stage-1", ...doc }));
    stageUpdate.mockImplementation(async (id, patch) => ({ id, ...patch }));
    stageDelete.mockResolvedValue({ id: "stage-1" });

    subjectList.mockResolvedValue([]);
    subjectCreate.mockImplementation(async (doc) => ({ id: "subject-1", ...doc }));
    subjectUpdate.mockImplementation(async (id, patch) => ({ id, ...patch }));
    subjectDelete.mockResolvedValue({ id: "subject-1" });
  });

  describe("education stages", () => {
    it("allows any authenticated role to list", async () => {
      await centerConfigService.listEducationStages(makeSession("teacher"));
      await centerConfigService.listEducationStages(makeSession("student"));
      await centerConfigService.listEducationStages(makeSession("admin"));
      expect(stageList).toHaveBeenCalledTimes(3);
    });

    it("rejects a non-admin from creating a stage", async () => {
      await expect(centerConfigService.createEducationStage(makeSession("teacher"), stageInput)).rejects.toThrow(
        ForbiddenError,
      );
      expect(stageCreate).not.toHaveBeenCalled();
    });

    it("lets an admin create a stage", async () => {
      const stage = await centerConfigService.createEducationStage(makeSession("admin"), stageInput);
      expect(stageCreate).toHaveBeenCalledWith(stageInput);
      expect(stage.id).toBe("stage-1");
    });

    it("rejects a non-admin from updating/deleting a stage", async () => {
      await expect(
        centerConfigService.updateEducationStage(makeSession("student"), "stage-1", { order: 1 }),
      ).rejects.toThrow(ForbiddenError);
      await expect(centerConfigService.deleteEducationStage(makeSession("teacher"), "stage-1")).rejects.toThrow(
        ForbiddenError,
      );
      expect(stageUpdate).not.toHaveBeenCalled();
      expect(stageDelete).not.toHaveBeenCalled();
    });

    it("lets an admin update/delete a stage", async () => {
      await centerConfigService.updateEducationStage(makeSession("admin"), "stage-1", { order: 2 });
      expect(stageUpdate).toHaveBeenCalledWith("stage-1", { order: 2 });

      await centerConfigService.deleteEducationStage(makeSession("admin"), "stage-1");
      expect(stageDelete).toHaveBeenCalledWith("stage-1");
    });
  });

  describe("subjects", () => {
    it("allows any authenticated role to list", async () => {
      await centerConfigService.listSubjects(makeSession("teacher"));
      await centerConfigService.listSubjects(makeSession("student"));
      await centerConfigService.listSubjects(makeSession("admin"));
      expect(subjectList).toHaveBeenCalledTimes(3);
    });

    it("rejects a non-admin from creating a subject", async () => {
      await expect(centerConfigService.createSubject(makeSession("student"), subjectInput)).rejects.toThrow(
        ForbiddenError,
      );
      expect(subjectCreate).not.toHaveBeenCalled();
    });

    it("lets an admin create a subject with a server-set createdAt", async () => {
      const subject = await centerConfigService.createSubject(makeSession("admin"), subjectInput);
      expect(subjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: subjectInput.name, createdAt: expect.any(Number) }),
      );
      expect(subject.id).toBe("subject-1");
    });

    it("rejects a non-admin from updating/deleting a subject", async () => {
      await expect(
        centerConfigService.updateSubject(makeSession("teacher"), "subject-1", { name: subjectInput.name }),
      ).rejects.toThrow(ForbiddenError);
      await expect(centerConfigService.deleteSubject(makeSession("student"), "subject-1")).rejects.toThrow(
        ForbiddenError,
      );
      expect(subjectUpdate).not.toHaveBeenCalled();
      expect(subjectDelete).not.toHaveBeenCalled();
    });

    it("lets an admin update/delete a subject", async () => {
      await centerConfigService.updateSubject(makeSession("admin"), "subject-1", { name: subjectInput.name });
      expect(subjectUpdate).toHaveBeenCalledWith("subject-1", { name: subjectInput.name });

      await centerConfigService.deleteSubject(makeSession("admin"), "subject-1");
      expect(subjectDelete).toHaveBeenCalledWith("subject-1");
    });
  });
});
