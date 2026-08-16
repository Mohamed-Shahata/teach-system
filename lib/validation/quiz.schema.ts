import { z } from "zod";
import { localizedRequiredTextSchema } from "@/lib/validation/common.schema";

/**
 * Quiz/question schemas — TASK-1201. See `docs/features/quizzes.md` and
 * `docs/database/collections.md` (`quizzes/{quizId}`, `questions/{questionId}`)
 * for the full shape and the `correctOptionIds`-never-to-students rule.
 */

export const quizStatusSchema = z.enum(["draft", "published"]);
export type QuizStatus = z.infer<typeof quizStatusSchema>;

export const questionTypeSchema = z.enum(["multiple_choice", "true_false"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const questionOptionSchema = z.object({
  id: z.string().trim().min(1),
  text: localizedRequiredTextSchema,
});
export type QuestionOptionInput = z.infer<typeof questionOptionSchema>;

/**
 * TASK-2101 — a quiz is either course-attached (`courseId` set) or a
 * standalone, stage-wide exam (`courseId` absent, `stageId` +
 * `scheduledAt` required instead). Mirrors `createAccountSchema`'s
 * role-driven cross-field `refine` pattern (`lib/validation/account.schema.ts`).
 * `teacherId` is only meaningful for an Admin creating a standalone exam
 * on a teacher's behalf — a Teacher caller always owns their own quiz
 * (`resolveOwnerTeacherId` ignores it for them) and course-attached
 * quizzes always derive `teacherId` from the course instead.
 */
export const createQuizSchema = z
  .object({
    courseId: z.string().trim().min(1).optional(),
    lessonId: z.string().trim().min(1).optional(),
    title: localizedRequiredTextSchema,
    stageId: z.string().trim().min(1).optional(),
    scheduledAt: z.coerce.number().int().positive().optional(),
    teacherId: z.string().trim().min(1).optional(),
    /** TASK-2102 — defaults to `true` (auto-graded) at the repository layer when absent. */
    autoGrade: z.boolean().optional(),
  })
  .refine((data) => !!data.courseId || !!data.stageId, {
    message: "errors.validation",
    path: ["stageId"],
  })
  .refine((data) => !!data.courseId || !!data.scheduledAt, {
    message: "errors.validation",
    path: ["scheduledAt"],
  });
export type CreateQuizInput = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = z
  .object({
    title: localizedRequiredTextSchema,
    lessonId: z.string().trim().min(1).nullable(),
    stageId: z.string().trim().min(1),
    scheduledAt: z.coerce.number().int().positive(),
    autoGrade: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "errors.validation" });
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;

/** Publishing is a distinct action from a field update — mirrors `courses`/`lessons`. */
export const setQuizStatusSchema = z.object({ status: quizStatusSchema });
export type SetQuizStatusInput = z.infer<typeof setQuizStatusSchema>;

/**
 * `questionIds` order on the quiz — driven by drag-and-drop in the
 * builder UI (TASK-1203), same pattern as `reorderLessonsSchema`.
 */
export const reorderQuestionsSchema = z.object({
  questionIds: z.array(z.string().trim().min(1)).min(1),
});
export type ReorderQuestionsInput = z.infer<typeof reorderQuestionsSchema>;

const baseQuestionObjectSchema = z.object({
  type: questionTypeSchema,
  prompt: localizedRequiredTextSchema,
  options: z.array(questionOptionSchema).min(2).max(8),
  correctOptionIds: z.array(z.string().trim().min(1)).min(1),
});

/**
 * Cross-field checks shared by create/update: every `correctOptionIds`
 * entry must reference a real option, options must have unique ids, and
 * `true_false` questions are exactly the two-option shape.
 */
function refineQuestion<T extends z.infer<typeof baseQuestionObjectSchema>>(data: T, ctx: z.RefinementCtx) {
  const optionIds = new Set(data.options.map((option) => option.id));
  if (optionIds.size !== data.options.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "errors.validation", path: ["options"] });
  }
  if (!data.correctOptionIds.every((id) => optionIds.has(id))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "errors.validation", path: ["correctOptionIds"] });
  }
  if (data.type === "true_false" && data.options.length !== 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "errors.validation", path: ["options"] });
  }
}

export const createQuestionSchema = baseQuestionObjectSchema.superRefine(refineQuestion);
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = baseQuestionObjectSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "errors.validation" })
  .superRefine((data, ctx) => {
    if (data.options && data.correctOptionIds) {
      refineQuestion(data as z.infer<typeof baseQuestionObjectSchema>, ctx);
    }
  });
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

/** Body for `POST /api/quizzes/[quizId]/attempts` (TASK-1202) — score is always server-computed, never client-submitted. */
export const submitQuizAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        selectedOptionIds: z.array(z.string().trim().min(1)),
      }),
    )
    .min(1),
});
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
