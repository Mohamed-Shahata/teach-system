# Feature: Quiz / Exam System

## Purpose
Let teachers assess students and let students take quizzes and see
results.

## User stories
- As a teacher, I can create a quiz with multiple-choice/true-false
  questions and publish it.
- As a student, I can take a published quiz for a course I'm enrolled in
  and see my score after submitting.

## Data
`quizzes`, `questions`, `quizAttempts` — see `database/collections.md`.

## Authorization & security
- `correctOptionIds` on `questions` is **never** sent to the student
  client before submission — the student-facing GET endpoint strips it.
- Score is computed server-side in `QuizService.submitAttempt`, comparing
  submitted `selectedOptionIds` against the server-held
  `correctOptionIds`; the client cannot submit a score directly.

## Extensibility
`question.type` is a string union (`"multiple_choice" | "true_false"`
in MVP) designed to grow to `short_answer | essay | matching` by adding
a new type + a new grading strategy, without rewriting the quiz-taking
flow.
