import router from '../router.js';
import state from '../state.js';
import bus from '../bus.js';
import ThreeViewer from '../preview/three-viewer.js';
import { attachTouchControls } from '../preview/touch-controls.js';
import { validate } from '../validation/validation.engine.js';
import validationPanel from '../components/validation-panel.component.js';
import skeleton from '../components/skeleton.component.js';
import toast from '../components/toast.component.js';
import { pipelineNav } from './_pipeline.js';
import { estimatePrint, fmtPrintTime, MATERIALS, LAYER_PRESETS } from '../utils/print-estimator.js';
import { fmtVolume, fmtMass } from '../utils/format.utils.js';

const previewView = {
  _viewer: null,
  _wireframe: false,

  async mount(container, { id }) {
    state.set('currentProjectId', id);
    const mesh = state.get('currentMesh');
    const metadata = state.get('currentMetadata');
    const partType = state.get('selectedPartType') || 'part';
    const aiProvider = state.get('aiProvider');

    container.innerHTML = `
      <div class="page page-enter">
        ${pipelineNav('preview', id)}
        <div class="page-header flex-between">
          <h2>Preview</h2>
          <div class="flex gap-2">
            <span class="badge ${['openrouter', 'groq', 'gemini', 'ollama'].includes(aiProvider) ? 'badge-ai' : 'badge-deterministic'}">
              ${['openrouter', 'groq', 'gemini', 'ollama'].includes(aiProvider) ? '✦ AI' : '◉ Deterministic'}
            </span>
            <span class="badge badge-muted">${partType}</span>
          </div>
        </div>

        <!-- 3D Viewer -->
        <div class="viewer-wrap" id="viewer-wrap">
          ${skeleton.viewer()}
          <div class="viewer-controls">
            <button class="viewer-btn" id="wireframe-btn" title="Toggle wireframe">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><line x1="22" y1="8.5" x2="12" y2="15.5"/><line x1="2" y1="8.5" x2="12" y2="15.5"/></svg>
            </button>
            <button class="viewer-btn" id="reset-camera-btn" title="Reset camera">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
          </div>
        </div>

        <!-- Stats -->
        ${metadata ? `
          <div class="glass-panel p-4 mt-4 grid-2">
            <div>
              <div class="text-xs text-dim mb-1">Volume</div>
              <div class="font-semibold">${fmtVolume(metadata.volume || 0)}</div>
            </div>
            <div>
              <div class="text-xs text-dim mb-1">Est. Mass (PLA)</div>
              <div class="font-semibold">${fmtMass(metadata.estimatedMass || 0)}</div>
            </div>
            <div>
              <div class="text-xs text-dim mb-1">Triangles</div>
              <div class="font-semibold">${(metadata.triangleCount || 0).toLocaleString()}</div>
            </div>
            <div>
              <div class="text-xs text-dim mb-1">Generator</div>
              <div class="font-semibold">${metadata.generatorId || '—'}</div>
            </div>
          </div>
        ` : ''}

        <!-- Print Estimator -->
        ${metadata?.volume ? `
        <div class="glass-panel p-5 mt-4" id="print-estimator">
          <div class="flex-between mb-4">
            <h3>Print Estimator</h3>
            <button class="btn btn-glass btn-sm" id="est-toggle">Hide</button>
          </div>
          <div id="est-body">
            <div class="grid-2 gap-3 mb-4">
              <div class="form-group mb-0">
                <label class="form-label">Material</label>
                <div class="select-wrapper">
                  <select class="input input-select" id="est-material">
                    ${Object.entries(MATERIALS).map(([k, m]) =>
                      `<option value="${k}">${m.label}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div class="form-group mb-0">
                <label class="form-label">Layer Height</label>
                <div class="select-wrapper">
                  <select class="input input-select" id="est-layer">
                    ${LAYER_PRESETS.map(p =>
                      `<option value="${p.value}" ${p.value === 0.20 ? 'selected' : ''}>${p.label}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
            <div class="form-group mb-4">
              <label class="form-label flex-between">
                <span>Infill</span>
                <span id="est-infill-val" class="text-accent font-semibold">20%</span>
              </label>
              <input type="range" class="est-slider" id="est-infill"
                min="5" max="100" step="5" value="20">
              <div class="flex-between text-xs text-dim mt-1">
                <span>5% — Hollow</span><span>50% — Solid feel</span><span>100% — Solid</span>
              </div>
            </div>
            <div class="est-results">
              <div class="est-card">
                <div class="est-label">Filament Used</div>
                <div class="est-value" id="est-weight">—</div>
                <div class="est-sub" id="est-length">—</div>
              </div>
              <div class="est-card">
                <div class="est-label">Est. Print Time</div>
                <div class="est-value" id="est-time">—</div>
                <div class="est-sub" id="est-cost">—</div>
              </div>
            </div>
            <p class="text-xs text-dim mt-3" style="text-align:center">
              Estimates assume 0.4 mm nozzle · 80 mm/s · 2 perimeters · prices at $22–40/kg
            </p>
          </div>
        </div>
        ` : ''}

        <!-- Validation -->
        <div id="validation-wrap">
          <div class="glass-panel p-4 mt-4">
            <div class="flex gap-3 items-center">
              <div class="spinner spinner-sm"></div>
              <span class="text-sm text-muted">Running engineering checks…</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 mt-6">
          <button class="btn btn-primary btn-lg flex-1" id="export-btn">
            Export
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="btn btn-glass" id="regen-btn">← Change Params</button>
        </div>
      </div>
    `;

    bus.emit('state:changed', {});

    // Initialize 3D viewer
    const viewerWrap = container.querySelector('#viewer-wrap');
    if (viewerWrap && mesh) {
      this._viewer = ThreeViewer;
      try {
        await ThreeViewer.init(viewerWrap);
        ThreeViewer.loadMesh(mesh);

        // Remove skeleton loader
        viewerWrap.querySelector('.viewer-skeleton')?.remove();

        // Attach touch controls
        const canvas = viewerWrap.querySelector('canvas');
        if (canvas) attachTouchControls(canvas, ThreeViewer.controls);

        // Wireframe toggle
        container.querySelector('#wireframe-btn')?.addEventListener('click', () => {
          const on = ThreeViewer.toggleWireframe();
          container.querySelector('#wireframe-btn').classList.toggle('active', on);
        });

        // Reset camera
        container.querySelector('#reset-camera-btn')?.addEventListener('click', () => {
          ThreeViewer.resetCamera();
        });

      } catch (e) {
        viewerWrap.innerHTML = `
          <div class="flex-center p-6 flex-col gap-3">
            <p class="text-error text-sm">3D preview unavailable: ${e.message}</p>
            <p class="text-xs text-dim">The STL file will still export correctly.</p>
          </div>
        `;
      }
    } else if (!mesh) {
      viewerWrap.innerHTML = `
        <div class="flex-center p-6 flex-col gap-3">
          <p class="text-muted">No model generated yet. Go back to Generator.</p>
        </div>
      `;
    }

    // Print estimator — live calculation
    if (metadata?.volume) {
      const updateEstimate = () => {
        const mat     = container.querySelector('#est-material')?.value || 'PLA';
        const infill  = parseInt(container.querySelector('#est-infill')?.value || '20');
        const layer   = parseFloat(container.querySelector('#est-layer')?.value || '0.20');
        const infillLabel = container.querySelector('#est-infill-val');
        if (infillLabel) infillLabel.textContent = `${infill}%`;

        const { weightG, filamentLengthM, printTimeMin, costUsd } = estimatePrint({
          volumeMm3: metadata.volume,
          infillPct: infill,
          layerHeightMm: layer,
          material: mat,
        });

        const wEl = container.querySelector('#est-weight');
        const lEl = container.querySelector('#est-length');
        const tEl = container.querySelector('#est-time');
        const cEl = container.querySelector('#est-cost');
        if (wEl) wEl.textContent = weightG < 10 ? `${weightG.toFixed(1)} g` : `${Math.round(weightG)} g`;
        if (lEl) lEl.textContent = `${filamentLengthM.toFixed(1)} m filament`;
        if (tEl) tEl.textContent = fmtPrintTime(printTimeMin);
        if (cEl) cEl.textContent = `~$${costUsd.toFixed(2)} material cost`;
      };

      ['#est-material', '#est-layer', '#est-infill'].forEach(sel => {
        container.querySelector(sel)?.addEventListener('input', updateEstimate);
        container.querySelector(sel)?.addEventListener('change', updateEstimate);
      });
      updateEstimate();

      // Collapse/expand toggle
      container.querySelector('#est-toggle')?.addEventListener('click', (e) => {
        const body = container.querySelector('#est-body');
        const btn  = e.currentTarget;
        const hidden = body.style.display === 'none';
        body.style.display = hidden ? '' : 'none';
        btn.textContent = hidden ? 'Hide' : 'Show';
      });
    }

    // Run validation in background
    if (mesh) {
      validate(mesh).then(report => {
        state.set('validationReport', report);
        const wrap = container.querySelector('#validation-wrap');
        if (wrap) validationPanel.render(wrap, report);
      }).catch(e => {
        console.warn('Validation failed:', e);
        const wrap = container.querySelector('#validation-wrap');
        if (wrap) wrap.innerHTML = '';
      });
    }

    // Navigation
    container.querySelector('#export-btn')?.addEventListener('click', () => {
      router.navigate(`/project/${id}/export`);
    });
    container.querySelector('#regen-btn')?.addEventListener('click', () => {
      router.navigate(`/project/${id}/generator`);
    });
  },

  unmount() {
    if (this._viewer) {
      try { ThreeViewer.dispose(); } catch(e) {}
    }
  }
};

export default previewView;
