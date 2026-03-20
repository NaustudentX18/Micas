import router from '../router.js';
import state from '../state.js';
import bus from '../bus.js';
import engine from '../questions/question.engine.js';
import toast from '../components/toast.component.js';
import { pipelineNav } from './_pipeline.js';
import partsStore from '../db/parts.store.js';

const questionsView = {
  _currentQuestion: null,
  _engine: null,

  async mount(container, { id }) {
    state.set('currentProjectId', id);
    const intake = state.get('intake');
    const answers = state.get('answers') || [];

    this._engine = Object.create(engine);
    this._engine.init(intake, answers);

    this._renderQuestion(container, id);
    bus.emit('state:changed', {});
  },

  _renderQuestion(container, projectId) {
    const q = this._engine.nextQuestion();
    const progress = this._engine.progress();
    const confidence = progress.confidence;

    if (!q || confidence >= 80) {
      // Done! Navigate to brief
      state.set('answers', this._engine.getAnswers());
      this._savePart(projectId);
      router.navigate(`/project/${projectId}/brief`);
      return;
    }

    this._currentQuestion = q;

    const pct = Math.min((progress.answered / Math.max(progress.total, 1)) * 100, 95);

    container.innerHTML = `
      <div class="page page-enter">
        ${pipelineNav('questions', projectId)}
        <div class="page-header">
          <div class="flex-between mb-2">
            <h2>Questions</h2>
            <span class="badge badge-accent">${Math.round(confidence)}% confident</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <p class="text-xs text-dim mt-2">${progress.answered} of ~${progress.total} questions answered</p>
        </div>

        <div class="glass-panel p-6 mb-6" id="question-card">
          <div class="badge badge-muted mb-4" style="text-transform:capitalize">${q.category}</div>
          <h3 class="mb-5" style="font-size:1.25rem;line-height:1.4">${q.text}</h3>

          <div id="answer-area">
            ${this._renderAnswerInput(q)}
          </div>

          <div class="flex gap-3 mt-6">
            <button class="btn btn-primary flex-1 btn-lg" id="answer-btn">Next →</button>
            <button class="btn btn-glass" id="skip-btn" title="Skip this question">Skip</button>
          </div>
        </div>

        ${confidence >= 60 ? `
          <div class="glass-panel p-4 flex gap-3 items-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div>
              <div class="text-sm font-semibold" style="color:var(--color-success)">Good enough to generate</div>
              <div class="text-xs text-muted">You can skip remaining questions and generate now.</div>
            </div>
            <button class="btn btn-glass btn-sm" id="generate-now-btn">Generate Now</button>
          </div>
        ` : ''}
      </div>
    `;

    container.querySelector('#answer-btn').addEventListener('click', () => this._submitAnswer(container, projectId, false));
    container.querySelector('#skip-btn').addEventListener('click', () => this._submitAnswer(container, projectId, true));
    container.querySelector('#generate-now-btn')?.addEventListener('click', () => {
      state.set('answers', this._engine.getAnswers());
      this._savePart(projectId);
      router.navigate(`/project/${projectId}/brief`);
    });

    // Enter key submits
    container.querySelector('#answer-area')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        container.querySelector('#answer-btn').click();
      }
    });

    // Auto-focus first input
    requestAnimationFrame(() => {
      const first = container.querySelector('input, select');
      first?.focus();
    });
  },

  _renderAnswerInput(q) {
    if (q.type === 'select') {
      return `
        <div class="toggle-group" role="radiogroup">
          ${q.options.map(opt => `
            <input type="radio" name="q-answer" id="opt-${opt.value}" value="${opt.value}" class="toggle-option">
            <label for="opt-${opt.value}" class="toggle-label">${opt.label}</label>
          `).join('')}
        </div>
      `;
    }
    if (q.type === 'boolean') {
      return `
        <div class="toggle-group" role="radiogroup">
          <input type="radio" name="q-answer" id="opt-yes" value="true" class="toggle-option">
          <label for="opt-yes" class="toggle-label">Yes</label>
          <input type="radio" name="q-answer" id="opt-no" value="false" class="toggle-option">
          <label for="opt-no" class="toggle-label">No</label>
        </div>
      `;
    }
    if (q.type === 'number') {
      return `
        <div class="input-unit-wrapper">
          <input class="input" id="q-input" type="number" placeholder="${q.placeholder || ''}"
            min="${q.min || ''}" max="${q.max || ''}" step="${q.step || 'any'}">
          ${q.unit ? `<span class="input-unit">${q.unit}</span>` : ''}
        </div>
        ${q.description ? `<p class="form-hint mt-2">${q.description}</p>` : ''}
      `;
    }
    if (q.type === 'text') {
      return `<input class="input" id="q-input" type="text" placeholder="${q.placeholder || ''}">`;
    }
    return `<input class="input" id="q-input" type="text">`;
  },

  _getAnswerValue(container) {
    const q = this._currentQuestion;
    if (q.type === 'select' || q.type === 'boolean') {
      const checked = container.querySelector('[name="q-answer"]:checked');
      if (!checked) return null;
      if (q.type === 'boolean') return checked.value === 'true';
      // Try numeric conversion for numeric option values
      const v = checked.value;
      return isNaN(parseFloat(v)) ? v : parseFloat(v);
    }
    const input = container.querySelector('#q-input');
    if (!input) return null;
    const v = input.value.trim();
    if (!v) return null;
    return q.type === 'number' ? parseFloat(v) : v;
  },

  _submitAnswer(container, projectId, skip) {
    if (!skip) {
      const value = this._getAnswerValue(container);
      if (value === null || value === '') {
        toast.warning('Please answer the question or tap Skip.');
        return;
      }
      this._engine.recordAnswer(this._currentQuestion.id, value);
    }
    state.set('answers', this._engine.getAnswers());
    this._renderQuestion(container, projectId);
  },

  async _savePart(projectId) {
    const partId = state.get('currentPartId');
    if (partId) {
      await partsStore.update(partId, {
        answers: this._engine.getAnswers(),
        confidence: this._engine.currentConfidence()
      }).catch(() => {});
    }
  },

  unmount() { this._engine = null; }
};

export default questionsView;
