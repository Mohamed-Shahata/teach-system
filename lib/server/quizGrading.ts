import "server-only";
import type { QuestionDoc } from "@/lib/server/repositories/questionRepository";
import type { SubmitQuizAttemptInput } from "@/lib/validation/quiz.schema";

/**
 * Shared exact-match grading logic, extracted from
 * `quizAttemptService` (TASK-1202) so TASK-3106's preview submission
 * can reuse the identical scoring rule without a second
 * implementation (`docs/development/coding-rules.md`'s "No Duplicate
 * Functionality") — preview must score exactly the way a real attempt
 * would, or the preview wouldn't be trustworthy.
 */

/** A question is correct only if the submitted set exactly matches the stored correct set — partial credit isn't part of the MVP grading model in `features/quizzes.md`. */
export function isAnswerCorrect(question: QuestionDoc, selectedOptionIds: string[]): boolean {
  const correct = new Set(question.correctOptionIds);
  const selected = new Set(selectedOptionIds);
  return correct.size === selected.size && [...correct].every((id) => selected.has(id));
}

export function computeScore(questions: QuestionDoc[], answers: SubmitQuizAttemptInput["answers"]): number {
  if (questions.length === 0) return 0;
  const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.selectedOptionIds]));
  const correctCount = questions.reduce((count, question) => {
    const selected = answerByQuestionId.get(question.id) ?? [];
    return isAnswerCorrect(question, selected) ? count + 1 : count;
  }, 0);
  return Math.round((correctCount / questions.length) * 100);
}
