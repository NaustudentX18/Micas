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
import { fmtVolume, fmtMass } from '../utils/format.utils.js';
import { estimatePrintTime, estimateCost, fmtPrintTime, getMaterial } from '/js/utils/materials.js';

const SWATCH_COLORS = [
  { hex: '#6c8aff', label: 'Blue' },
  { hex: '#a46cff', label: 'Purple' },
  { hex: '#4cf0b0', label: 'Teal' },
  { hex: '#ff7a45', label: 'Orange' },
  { hex: '#f5c542', label: 'Yellow' },
  { hex: '#ff4f6d', label: 'Red' },
  { hex: '#ffffff', label: 'White' },
  { hex: '#333344', label: 'Dark' },
];

const previewView = {
  _viewer: null,
  _wireframe: false,
  _activeColor: SWATCH_COLORS[0].hex,

  async mount(container, { id }) {
    state.set('currentProjectId', id);
    const mesh = state.get('currentMesh');
    const metadata = state.get('currentMetadata');
    const partType = state.get('selectedPartType') || 'part';
    const aiProvider = state.get('aiProvider');

    // Compute estimated print time and cost using default PLA settings
    const pla = getMaterial('pla');
    const volumeMm3 = metadata?.volume || 0;
    const massGrams = metadata?.estimatedMass || 0;
    const printMinutes = estimatePrintTime(volumeMm3, 0.2, 60, 20);
    const costUsd = estimateCost(massGrams, pla?.pricePerKg || 20);

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
        <div class="viewer-wrap" id="viewer-wrap" style="position:relative">
          ${skeleton.viewer()}
          <div class="viewer-controls">
            <button class="viewer-btn" id="wireframe-btn" title="Toggle wireframe">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><line x1="22" y1="8.5" x2="12" y2="15.5"/><line x1="2" y1="8.5" x2="12" y2="15.5"/></svg>
            </button>
            <button class="viewer-btn" id="reset-camera-btn" title="Reset camera">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
          </div>
          <!-- Color swatches -->
          <div class="color-picker-row" id="color-swatches">
            ${SWATCH_COLORS.map((c, i) => `
              <button
                class="color-swatch${i === 0 ? ' active' : ''}"
                style="background:${c.hex}"
                data-color="${c.hex}"
                title="${c.label}"
                aria-label="Set model color to ${c.label}"
              ></button>
            `).join('')}
          </div>
        </div>

        <!-- Stats -->
        ${metadata ? `
          <div class="glass-panel p-4 mt-4" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <div class="text-xs text-dim mb-1">Volume</div>
              <div class="font-semibold">${fmtVolume(volumeMm3)}</div>
            </div>
            <div>
              <div class="text-xs text-dim mb-1">Est. Mass (PLA)</div>
              <div class="font-semibold">${fmtMass(massGrams)}</div>
            </div>
            <div>
              <div class="text-xs text-dim mb-1">Triangles</div>
              <div class="font-semibold">${(metadata.triangleCount || 0).toLocaleString()}</div>
            </div>
            <div>
              <div class="text-xs text-dim mb-1">Generator</div>
              <div class="font-semibold">${metadata.generatorId || '—'}</div>
            </div>
            <div>
              <div class="text-xs text-dim mb-1">Est. Print Time</div>
              <div class="font-semibold">${fmtPrintTime(printMinutes)}</div>
            </div>
            <div>
              <div class="text-xs text-dim mb-1">Material Cost</div>
              <div class="font-semibold">${massGrams > 0 ? `~$${costUsd.toFixed(2)}` : '—'}</div>
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

        // Apply initial color
        ThreeViewer.setMaterialColor(this._activeColor);

        // Wireframe toggle
        container.querySelector('#wireframe-btn')?.addEventListener('click', () => {
          const on = ThreeViewer.toggleWireframe();
          container.querySelector('#wireframe-btn').classList.toggle('active', on);
        });

        // Reset camera
        container.querySelector('#reset-camera-btn')?.addEventListener('click', () => {
          ThreeViewer.resetCamera();
        });

        // Color swatches
        container.querySelectorAll('.color-swatch').forEach(swatch => {
          swatch.addEventListener('click', () => {
            this._activeColor = swatch.dataset.color;
            ThreeViewer.setMaterialColor(this._activeColor);
            container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
          });
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
