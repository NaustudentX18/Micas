import router from '../router.js';
import state from '../state.js';
import bus from '../bus.js';
import aiManager from '../ai/ai.manager.js';
import confidenceMeter from '../components/confidence-meter.component.js';
import assumptionsPanel from '../components/assumptions-panel.component.js';
import toast from '../components/toast.component.js';
import skeleton from '../components/skeleton.component.js';
import { pipelineNav } from './_pipeline.js';
import partsStore from '../db/parts.store.js';
import projectsStore from '../db/projects.store.js';

const briefView = {
  async mount(container, { id }) {
    state.set('currentProjectId', id);

    // Show loading state
    container.innerHTML = `
      <div class="page page-enter">
        ${pipelineNav('brief', id)}
        <div class="page-header">
          <h2>Analyzing Design…</h2>
        </div>
        ${skeleton.card(2)}
        <div class="flex-center mt-6">
          <div class="spinner spinner-lg"></div>
        </div>
      </div>
    `;

    bus.emit('state:changed', {});

    try {
      const intake = state.get('intake');
      const answers = state.get('answers') || [];

      const result = await aiManager.analyze(intake, answers);

      state.set('brief', result.cadBrief);
      state.set('confidence', result.confidence);
      state.set('assumptions', result.assumptions);
      state.set('missingInfo', result.missingInfo);
      state.set('reasoning', result.reasoning);
      state.set('aiProvider', result.provider);

      // Save to DB
      const partId = state.get('currentPartId');
      if (partId) {
        await partsStore.update(partId, {
          brief: result.cadBrief,
          confidence: result.confidence,
          assumptions: result.assumptions,
          aiProvider: result.provider,
        }).catch(() => {});
      }
      await projectsStore.update(id, { status: 'brief' }).catch(() => {});

      this._render(container, id, result);
    } catch (e) {
      toast.error('Analysis failed: ' + e.message);
      container.innerHTML = `
        <div class="page">
          ${pipelineNav('brief', id)}
          <div class="glass-panel p-6 mt-4">
            <h3 class="text-error mb-2">Analysis Failed</h3>
            <p class="mb-4">${e.message}</p>
            <div class="flex gap-3">
              <button class="btn btn-primary" onclick="history.back()">← Go Back</button>
            </div>
          </div>
        </div>
      `;
    }
  },

  _render(container, projectId, result) {
    const { cadBrief, confidence, assumptions, missingInfo, reasoning, provider } = result;
    const low = confidence < 80;
    const isAI = provider !== 'rule-based';

    const dimEntries = Object.entries(cadBrief?.dimensions || {}).filter(([,v]) => v != null && typeof v === 'number');
    const photos = state.get('intake')?.photos || [];
    const hasPhotos = photos.length > 0;
    const imageAnalysisProvider = state.get('imageAnalysisProvider');

    container.innerHTML = `
      <div class="page page-enter">
        ${pipelineNav('brief', projectId)}
        <div class="page-header flex-between">
          <h2>Design Brief</h2>
          <span class="badge ${isAI ? 'badge-ai' : 'badge-deterministic'}">
            ${isAI ? '✦ AI Analysis' : '◉ Offline Analysis'}
          </span>
        </div>

        <!-- Confidence meter -->
        <div class="glass-panel p-6 mb-4 text-center">
          <div id="conf-meter"></div>
          ${low ? `
            <div class="glass-inset p-3 mt-4 flex gap-2 items-start text-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2" style="flex-shrink:0;margin-top:2px"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div>
                <div class="text-sm font-semibold text-warning">More information would help</div>
                <div class="text-xs text-muted mt-1">The model will still generate, but results may not match your intent perfectly.</div>
              </div>
            </div>
          ` : `
            <div class="text-sm text-success mt-3">✓ Confidence threshold met — ready to generate</div>
          `}
        </div>

        ${hasPhotos ? `
          <div class="glass-panel p-4 mb-4">
            <div class="flex-between mb-3">
              <h4>Reference Photos</h4>
              <span class="badge badge-ai" style="font-size:0.65rem">✦ Vision Analyzed</span>
            </div>
            <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">
              ${photos.map(p => `
                <div style="flex-shrink:0;width:80px;height:80px;border-radius:10px;overflow:hidden;border:1px solid var(--glass-border)">
                  <img src="${p.dataUrl}" alt="reference" style="width:100%;height:100%;object-fit:cover;display:block">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Brief details -->
        <div class="glass-panel p-5 mb-4">
          <h3 class="mb-4">Part Summary</h3>
          <div class="info-row">
            <span class="info-row-label">Object Type</span>
            <span class="info-row-value">${cadBrief?.object_type || '—'}</span>
          </div>
          <div class="info-row">
            <span class="info-row-label">Generator</span>
            <span class="info-row-value">${cadBrief?.recommended_generator || '—'}</span>
          </div>
          <div class="info-row">
            <span class="info-row-label">Material</span>
            <span class="info-row-value">${cadBrief?.material_recommendation || 'PLA'}</span>
          </div>
          <div class="info-row">
            <span class="info-row-label">Fit Tolerance</span>
            <span class="info-row-value">${cadBrief?.tolerances?.fit || 'standard'}</span>
          </div>
          ${dimEntries.map(([k, v]) => `
            <div class="info-row">
              <span class="info-row-label">${k}</span>
              <span class="info-row-value">${v.toFixed(1)} mm</span>
            </div>
          `).join('')}
        </div>

        <!-- Why this design -->
        ${reasoning ? `
          <div class="why-panel mb-4">
            <div class="why-panel-label">Why This Design?</div>
            <p>${reasoning}</p>
          </div>
        ` : ''}

        <!-- Assumptions panel -->
        <div id="assumptions-wrap"></div>

        <!-- Actions -->
        <div class="flex gap-3 mt-6 flex-col">
          <button class="btn btn-primary btn-lg btn-full" id="generate-btn">
            Generate Model
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
          ${low ? `
            <button class="btn btn-glass btn-full" id="more-questions-btn">
              Answer More Questions
            </button>
          ` : ''}
          <button class="btn btn-glass btn-full" id="back-btn">← Back to Intake</button>
        </div>
      </div>
    `;

    // Render confidence meter
    const meterEl = container.querySelector('#conf-meter');
    confidenceMeter.render(meterEl, confidence);

    // Render assumptions panel
    const assumpEl = container.querySelector('#assumptions-wrap');
    assumptionsPanel.render(assumpEl, { assumptions, missingInfo });

    // Actions
    container.querySelector('#generate-btn').addEventListener('click', () => {
      router.navigate(`/project/${projectId}/generator`);
    });
    container.querySelector('#more-questions-btn')?.addEventListener('click', () => {
      router.navigate(`/project/${projectId}/questions`);
    });
    container.querySelector('#back-btn').addEventListener('click', () => {
      router.navigate(`/project/${projectId}/intake`);
    });
  },

  unmount() {}
};

export default briefView;
