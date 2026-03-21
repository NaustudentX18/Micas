import router from '../router.js';
import state from '../state.js';
import bus from '../bus.js';
import generatorRegistry, { GENERATOR_LIST } from '../generators/generator.registry.js';
import toast from '../components/toast.component.js';
import skeleton from '../components/skeleton.component.js';
import { pipelineNav } from './_pipeline.js';
import partsStore from '../db/parts.store.js';
import projectsStore from '../db/projects.store.js';
import { haptic, attachKeyboardScrolling } from '../utils/mobile.js';

const generatorView = {
  _selectedId: null,
  _params: {},

  async mount(container, { id }) {
    state.set('currentProjectId', id);
    const brief = state.get('brief');
    const suggestedId = brief?.recommended_generator || 'box';
    this._selectedId = state.get('selectedPartType') || suggestedId;
    this._params = { ...state.get('generatorParams') };

    this._renderTypeSelector(container, id);
    bus.emit('state:changed', {});
  },

  _renderTypeSelector(container, projectId) {
    const v1 = GENERATOR_LIST.filter(g => g.category === 'v1');
    const v2 = GENERATOR_LIST.filter(g => g.category === 'v2');
    const v3 = GENERATOR_LIST.filter(g => g.category === 'v3');

    container.innerHTML = `
      <div class="page page-enter">
        ${pipelineNav('generator', projectId)}
        <div class="page-header flex-between">
          <h2>Generator</h2>
          ${this._selectedId ? `<span class="badge badge-muted">${this._selectedId}</span>` : ''}
        </div>

        <div class="page-section">
          <div class="page-section-title">Part Type</div>
          <div class="generator-grid" id="gen-grid">
            ${v1.map(g => this._tileHTML(g)).join('')}
          </div>
          <div class="page-section-title mt-4">Precision Parts (V2)</div>
          <div class="generator-grid">
            ${v2.map(g => this._tileHTML(g)).join('')}
          </div>
          <div class="page-section-title mt-4">Hardware &amp; Routing (V3)</div>
          <div class="generator-grid">
            ${v3.map(g => this._tileHTML(g)).join('')}
          </div>
        </div>

        <div id="params-area"></div>

        <div class="mt-6 flex gap-3">
          <button class="btn btn-primary btn-lg btn-full" id="generate-btn" disabled>
            <span class="spinner spinner-sm hidden" id="gen-spinner"></span>
            Generate & Preview
          </button>
        </div>
      </div>
    `;

    // Bind tile clicks
    container.querySelectorAll('.generator-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        haptic('light');
        this._selectedId = tile.dataset.id;
        container.querySelectorAll('.generator-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        state.set('selectedPartType', this._selectedId);
        this._loadParamForm(container, projectId);
      });
    });

    // Auto-select suggested
    if (this._selectedId) {
      const tile = container.querySelector(`[data-id="${this._selectedId}"]`);
      tile?.classList.add('selected');
      this._loadParamForm(container, projectId);
    }
  },

  _tileHTML(g) {
    const isSelected = g.id === this._selectedId;
    return `
      <div class="generator-tile ${isSelected ? 'selected' : ''}" data-id="${g.id}" role="button" tabindex="0"
        aria-label="${g.label}: ${g.description}">
        <span class="generator-tile-icon">${g.icon}</span>
        <span class="generator-tile-label">${g.label}</span>
        ${g.category === 'v2' ? '<span class="badge badge-ai" style="font-size:0.6rem">V2</span>' : g.category === 'v3' ? '<span class="badge badge-success" style="font-size:0.6rem">V3</span>' : ''}
      </div>
    `;
  },

  async _loadParamForm(container, projectId) {
    const paramsArea = container.querySelector('#params-area');
    if (!paramsArea) return;

    paramsArea.innerHTML = `<div class="mt-4">${skeleton.card(1)}</div>`;
    const generateBtn = container.querySelector('#generate-btn');
    if (generateBtn) generateBtn.disabled = true;

    try {
      const gen = await generatorRegistry.get(this._selectedId);
      const brief = state.get('brief');

      // Merge brief dims into defaults
      const briefDims = brief?.dimensions || {};
      const defaultParams = {};
      for (const field of gen.paramSchema) {
        let val = this._params[field.id] ?? field.default;
        // Override with brief dimensions
        if (field.id === 'width' && briefDims.width) val = briefDims.width;
        if (field.id === 'depth' && briefDims.depth) val = briefDims.depth;
        if (field.id === 'height' && briefDims.height) val = briefDims.height;
        if (field.id === 'wallThickness' && briefDims.wallThickness) val = briefDims.wallThickness;
        defaultParams[field.id] = val;
      }
      this._params = { ...defaultParams };

      paramsArea.innerHTML = `
        <div class="glass-panel p-5 mt-4">
          <div class="flex-between mb-4">
            <h3>${gen.label} Parameters</h3>
            <span class="text-xs text-muted">${gen.description}</span>
          </div>
          <div id="param-fields">
            ${gen.paramSchema.map(field => this._fieldHTML(field, this._params[field.id])).join('')}
          </div>
          <div id="validation-errors" class="mt-3 hidden"></div>
        </div>
      `;

      // Bind param inputs
      paramsArea.querySelectorAll('[data-param]').forEach(input => {
        input.addEventListener('change', () => {
          this._params[input.dataset.param] = this._parseInputValue(input);
        });
        input.addEventListener('input', () => {
          this._params[input.dataset.param] = this._parseInputValue(input);
        });
      });

      // Attach keyboard scroll avoidance for param inputs
      attachKeyboardScrolling(paramsArea);

      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.addEventListener('click', () => {
          haptic('medium');
          this._generate(container, projectId, gen);
        });
      }
    } catch (e) {
      paramsArea.innerHTML = `<p class="text-error mt-4">Failed to load generator: ${e.message}</p>`;
    }
  },

  _fieldHTML(field, value) {
    const id = `field-${field.id}`;

    if (field.type === 'boolean') {
      return `
        <div class="form-group mb-4">
          <div class="flex-between">
            <label class="form-label" for="${id}">${field.label}</label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" id="${id}" data-param="${field.id}" ${value ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-accent)">
              <span class="text-sm">${value ? 'Yes' : 'No'}</span>
            </label>
          </div>
          ${field.description ? `<p class="form-hint">${field.description}</p>` : ''}
        </div>
      `;
    }

    if (field.type === 'select') {
      return `
        <div class="form-group mb-4">
          <label class="form-label" for="${id}">${field.label}</label>
          <div class="select-wrapper">
            <select class="input input-select" id="${id}" data-param="${field.id}">
              ${(field.options || []).map(opt => `
                <option value="${opt.value}" ${opt.value == value ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>
          ${field.description ? `<p class="form-hint">${field.description}</p>` : ''}
        </div>
      `;
    }

    if (field.type === 'number') {
      return `
        <div class="form-group mb-4">
          <label class="form-label" for="${id}">${field.label}</label>
          <div class="input-unit-wrapper">
            <input class="input" type="number" inputmode="decimal" id="${id}" data-param="${field.id}"
              value="${value ?? field.default}" min="${field.min ?? ''}" max="${field.max ?? ''}"
              step="${field.step ?? 'any'}" autocomplete="off" enterkeyhint="done">
            ${field.unit ? `<span class="input-unit">${field.unit}</span>` : ''}
          </div>
          ${field.description ? `<p class="form-hint">${field.description}</p>` : ''}
        </div>
      `;
    }

    if (field.type === 'text') {
      return `
        <div class="form-group mb-4">
          <label class="form-label" for="${id}">${field.label}</label>
          <input class="input" type="text" id="${id}" data-param="${field.id}" value="${value ?? field.default ?? ''}">
          ${field.description ? `<p class="form-hint">${field.description}</p>` : ''}
        </div>
      `;
    }
    return '';
  },

  _parseInputValue(input) {
    if (input.type === 'checkbox') return input.checked;
    if (input.type === 'number') return parseFloat(input.value) || 0;
    return input.value;
  },

  async _generate(container, projectId, gen) {
    // Re-read params from DOM
    container.querySelectorAll('[data-param]').forEach(input => {
      this._params[input.dataset.param] = this._parseInputValue(input);
    });

    // Validate
    const errors = gen.validate(this._params);
    const errDiv = container.querySelector('#validation-errors');
    if (errors.length > 0) {
      errDiv.classList.remove('hidden');
      errDiv.innerHTML = errors.map(e => `<p class="form-error">⚠ ${e}</p>`).join('');
      return;
    }
    errDiv?.classList.add('hidden');

    const btn = container.querySelector('#generate-btn');
    const spinner = container.querySelector('#gen-spinner');
    btn.disabled = true;
    spinner?.classList.remove('hidden');
    btn.childNodes[btn.childNodes.length - 1].textContent = ' Generating…';

    try {
      const result = gen.generate(this._params);

      state.set('currentMesh', result.mesh);
      state.set('currentOpenSCAD', result.openscadSource);
      state.set('currentMetadata', result.metadata);
      state.set('generatorParams', { ...this._params });
      state.set('selectedPartType', this._selectedId);

      // Save to DB
      const partId = state.get('currentPartId');
      if (partId) {
        await partsStore.update(partId, {
          partType: this._selectedId,
          generatorParams: this._params,
          openscadSource: result.openscadSource,
          metadata: result.metadata,
        }).catch(() => {});
      }
      await projectsStore.update(projectId, { status: 'preview' }).catch(() => {});

      bus.emit('generator:mesh-ready', result);
      toast.success('Model generated!');
      router.navigate(`/project/${projectId}/preview`);
    } catch (e) {
      toast.error('Generation failed: ' + e.message);
      console.error(e);
    } finally {
      btn.disabled = false;
      spinner?.classList.add('hidden');
    }
  },

  unmount() {}
};

export default generatorView;
