import { questions } from './question.bank.js';
import { computeConfidence, applicableQuestions } from './question.scorer.js';

/**
 * Adaptive question engine.
 * Selects questions by priority, tracks confidence, decides when to stop.
 */

const CONFIDENCE_THRESHOLD = 80;

const engine = {
  _intake: {},
  _answers: [],

  init(intake, answers = []) {
    this._intake = intake || {};
    this._answers = [...answers];
    return this;
  },

  currentConfidence() {
    return computeConfidence(this._intake, this._answers);
  },

  shouldAskMore() {
    return this.currentConfidence() < CONFIDENCE_THRESHOLD && this.nextQuestion() !== null;
  },

  nextQuestion() {
    const answered = new Set(this._answers.map(a => a.questionId));
    const applicable = questions.filter(q =>
      q.condition(this._intake, this._answers) && !answered.has(q.id)
    );

    if (applicable.length === 0) return null;

    // Sort by confidence weight DESC, then by order in bank
    applicable.sort((a, b) => b.confidenceWeight - a.confidenceWeight);
    return applicable[0];
  },

  allNextQuestions() {
    const answered = new Set(this._answers.map(a => a.questionId));
    return questions.filter(q =>
      q.condition(this._intake, this._answers) && !answered.has(q.id)
    ).sort((a, b) => b.confidenceWeight - a.confidenceWeight);
  },

  recordAnswer(questionId, value) {
    this._answers = this._answers.filter(a => a.questionId !== questionId);
    this._answers.push({ questionId, value });
  },

  getAnswers() {
    return [...this._answers];
  },

  buildBriefData() {
    const data = { intake: this._intake, answers: this._answers, confidence: this.currentConfidence() };
    for (const a of this._answers) {
      data[a.questionId] = a.value;
    }
    return data;
  },

  progress() {
    const applicable = applicableQuestions(this._intake, this._answers);
    const answered = this._answers.filter(a => applicable.some(q => q.id === a.questionId));
    return {
      total: applicable.length,
      answered: answered.length,
      confidence: this.currentConfidence()
    };
  }
};

export default engine;
