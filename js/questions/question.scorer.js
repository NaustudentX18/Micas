/**
 * Scores the current answer set for confidence contribution.
 * Returns a 0-100 confidence value.
 */

import { questions } from './question.bank.js';

const MAX_POSSIBLE_WEIGHT = questions.reduce((s, q) => s + q.confidenceWeight, 0);

export function computeConfidence(intake, answers) {
  let total = 0;
  for (const q of questions) {
    if (!q.condition(intake, answers)) continue; // not applicable
    const answered = answers.find(a => a.questionId === q.id);
    if (answered) total += q.confidenceWeight;
  }
  return Math.min(Math.round((total / MAX_POSSIBLE_WEIGHT) * 100), 95);
}

export function applicableQuestions(intake, answers) {
  return questions.filter(q => q.condition(intake, answers));
}

export function answeredCount(intake, answers) {
  return applicableQuestions(intake, answers).filter(q =>
    answers.find(a => a.questionId === q.id)
  ).length;
}

export function totalApplicable(intake, answers) {
  return applicableQuestions(intake, answers).length;
}
