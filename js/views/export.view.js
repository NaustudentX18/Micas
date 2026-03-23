import router from '../router.js';
import state from '../state.js';
import bus from '../bus.js';
import exportManager from '../export/export.manager.js';
import toast from '../components/toast.component.js';
import { pipelineNav } from './_pipeline.js';
import { fmtVolume, fmtMass, fmtDate } from '../utils/format.utils.js';
import projectsStore from '../db/projects.store.js';
import { MATERIALS, estimatePrintTime, estimateCost, fmtPrintTime } from '/js/utils/materials.js';

const PRINTER_PROFILES = [
  { id: 'bambu-x1c',  name: 'Bambu X1C',    spec: '256×256×256 mm · 0.05–0.35 mm · 500 mm/s', speed: 100 },
  { id: 'bambu-p1s',  name: 'Bambu P1S',    spec: '256×256×256 mm · 0.05–0.35 mm · AMS · Enclosed', speed: 100 },
  { id: 'prusa-mk4',  name: 'Prusa MK4',    spec: '250×210×220 mm · 0.05–0.35 mm', speed: 60 },
  { id: 'ender-3',    name: 'Ender 3',       spec: '220×220×250 mm · 0.1–0.4 mm',   speed: 50 },
  { id: 'voron-24',   name: 'Voron 2.4',    spec: '350×350×350 mm · 0.1–0.5 mm',   speed: 80 },
];

const exportView = {
  _selectedPrinter: PRINTER_PROFILES[0].id,
  _selectedMaterial: 'pla',
  _layerHeight: 0.2,
  _infill: 20,
  _pricePerKg: 20,

  async mount(container, { id }) {
    state.set('currentProjectId', id);
    const project = await projectsStore.get(id).catch(() => null);
    const mesh = state.get('currentMesh');
    const brief = state.get('brief');
    const metadata = state.get('currentMetadata');
    const validationReport = state.get('validationReport');
    const partType = state.get('selectedPartType') || 'part';
    const confidence = state.get('confidence') || 0;
    const aiProvider = state.get('aiProvider');
    const params = state.get('generatorParams');
    const answers = state.get('answers') || [];

    const analysisResult = {
      cadBrief: brief,
      confidence,
      assumptions: state.get('assumptions') || [],
      missingInfo: state.get('missingInfo') || [],
      reasoning: state.get('reasoning') || '',
      provider: aiProvider
    };

    const partName = `${partType}_${Date.now().toString(36)}`;

    // Reset per-mount state
    this._selectedPrinter = PRINTER_PROFILES[0].id;
    this._selectedMaterial = 'pla';
    this._layerHeight = 0.2;
    this._infill = 20;
    this._pricePerKg = 20;

    container.innerHTML = `
      <div class="page page-enter">
        ${pipelineNav('export', id)}
        <div class="page-header">
          <h2>Export Center</h2>
          <p>${partType} — ${fmtDate(Date.now())}</p>
        </div>

        <!-- Export confidence summary -->
        <div class="glass-panel p-4 mb-4">
          <div class="flex-between mb-3">
            <h4>Export Summary</h4>
            <span class="badge ${confidence >= 80 ? 'badge-success' : confidence >= 60 ? 'badge-warning' : 'badge-error'}">
              ${confidence}% confidence
            </span>
          </div>
          ${metadata ? `
            <div class="info-row">
              <span class="info-row-label">Volume</span>
              <span class="info-row-value">${fmtVolume(metadata.volume || 0)}</span>
            </div>
            <div class="info-row">
              <span class="info-row-label">Est. mass (PLA)</span>
              <span class="info-row-value">${fmtMass(metadata.estimatedMass || 0)}</span>
            </div>
            <div class="info-row">
              <span class="info-row-label">Triangles</span>
              <span class="info-row-value">${(metadata.triangleCount || 0).toLocaleString()}</span>
            </div>
          ` : ''}
          ${validationReport ? `
            <div class="info-row">
              <span class="info-row-label">Validation</span>
              <span class="info-row-value ${validationReport.printable ? 'text-success' : 'text-warning'}">
                ${validationReport.printable ? '✓ Printable' : '⚠ Review required'} (${validationReport.score}/100)
              </span>
            </div>
          ` : ''}
          <div class="info-row">
            <span class="info-row-label">AI Provider</span>
            <span class="info-row-value">${aiProvider === 'openrouter' ? 'AI Analysis' : 'Offline Rule-Based'}</span>
          </div>
        </div>

        <!-- Printer Profiles -->
        <div class="page-section-title">Printer Profile</div>
        <div class="printer-profiles mb-4">
          ${PRINTER_PROFILES.map(p => `
            <button class="printer-profile-card${p.id === this._selectedPrinter ? ' selected' : ''}" data-printer="${p.id}">
              <div class="printer-profile-name">${p.name}</div>
              <div class="printer-profile-spec">${p.spec}</div>
            </button>
          `).join('')}
        </div>

        <!-- Material & Cost Calculator -->
        <div class="page-section-title">Material &amp; Cost Calculator</div>
        <div class="calc-panel mb-4">
          <div class="p-4">
            <div class="form-group mb-3">
              <label class="form-label">Material</label>
              <div class="select-wrapper">
                <select class="input input-select" id="calc-material">
                  ${MATERIALS.map(m => `<option value="${m.id}" ${m.id === 'pla' ? 'selected' : ''}>${m.name} — ${m.nozzleTemp ? m.nozzleTemp + '°C nozzle' : 'Resin'}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Layer Height: <span id="lh-val">0.20</span> mm</label>
              <input type="range" id="calc-layer" min="0.05" max="0.40" step="0.05" value="0.20" style="width:100%">
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Infill: <span id="inf-val">20</span>%</label>
              <input type="range" id="calc-infill" min="5" max="100" step="5" value="20" style="width:100%">
            </div>
            <div class="form-group">
              <label class="form-label">Filament Price ($/kg)</label>
              <input class="input" type="number" id="calc-price" min="1" max="500" step="1" value="20">
            </div>
            <div class="calc-result-grid" id="calc-results">
              <div class="calc-result-item">
                <div class="calc-result-value" id="res-time">—</div>
                <div class="calc-result-label">Print Time</div>
              </div>
              <div class="calc-result-item">
                <div class="calc-result-value" id="res-grams">—</div>
                <div class="calc-result-label">Filament (g)</div>
              </div>
              <div class="calc-result-item">
                <div class="calc-result-value" id="res-cost">—</div>
                <div class="calc-result-label">Material Cost</div>
              </div>
              <div class="calc-result-item">
                <div class="calc-result-value" id="res-temps">—</div>
                <div class="calc-result-label">Nozzle / Bed</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Primary exports -->
        <div class="page-section-title">3D Model Files</div>
        <div class="export-grid mb-4">
          <button class="export-btn" id="exp-stl" ${!mesh ? 'disabled style="opacity:0.4"' : ''}>
            <span class="export-btn-icon">📐</span>
            <span class="export-btn-text">
              <span class="export-btn-label">STL File</span>
              <span class="export-btn-sub">For Bambu, Prusa, Cura</span>
            </span>
          </button>
          <button class="export-btn" id="exp-scad">
            <span class="export-btn-icon">📝</span>
            <span class="export-btn-text">
              <span class="export-btn-label">OpenSCAD</span>
              <span class="export-btn-sub">Editable parametric source</span>
            </span>
          </button>
        </div>

        <div class="page-section-title">Print Preparation</div>
        <div class="export-grid mb-4">
          <button class="export-btn" id="exp-bambu">
            <span class="export-btn-icon">🔵</span>
            <span class="export-btn-text">
              <span class="export-btn-label">Bambu Sheet</span>
              <span class="export-btn-sub">Print settings JSON</span>
            </span>
          </button>
          <button class="export-btn" id="exp-makerworld">
            <span class="export-btn-icon">🌍</span>
            <span class="export-btn-text">
              <span class="export-btn-label">MakerWorld Draft</span>
              <span class="export-btn-sub">Listing markdown</span>
            </span>
          </button>
        </div>

        <div class="page-section-title">Project Documentation</div>
        <div class="export-grid mb-4">
          <button class="export-btn" id="exp-params">
            <span class="export-btn-icon">⚙️</span>
            <span class="export-btn-text">
              <span class="export-btn-label">Parametric JSON</span>
              <span class="export-btn-sub">Re-importable design spec</span>
            </span>
          </button>
          <button class="export-btn" id="exp-summary">
            <span class="export-btn-icon">📋</span>
            <span class="export-btn-text">
              <span class="export-btn-label">Job Summary</span>
              <span class="export-btn-sub">Human-readable report</span>
            </span>
          </button>
          <button class="export-btn" id="exp-confidence">
            <span class="export-btn-icon">🎯</span>
            <span class="export-btn-text">
              <span class="export-btn-label">Confidence Report</span>
              <span class="export-btn-sub">AI assumptions & gaps</span>
            </span>
          </button>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="btn btn-glass btn-full" id="back-preview-btn">← Back to Preview</button>
          <button class="btn btn-glass btn-full" id="new-project-btn">New Project</button>
        </div>
      </div>
    `;

    bus.emit('state:changed', {});

    // Calculator update function
    const updateCalc = () => {
      const matId = container.querySelector('#calc-material')?.value || 'pla';
      const mat = MATERIALS.find(m => m.id === matId) || MATERIALS[0];
      const lh = parseFloat(container.querySelector('#calc-layer')?.value || '0.20');
      const infill = parseInt(container.querySelector('#calc-infill')?.value || '20', 10);
      const price = parseFloat(container.querySelector('#calc-price')?.value || '20');

      // Use metadata volume or 0
      const vol = metadata?.volume || 0;
      // Effective mass: volume * density * infill fraction (simplified)
      const shellFraction = 0.25;
      const infillFraction = infill / 100;
      const effectiveDensity = mat.density * (shellFraction + (1 - shellFraction) * infillFraction);
      const grams = vol > 0 ? (vol / 1000) * effectiveDensity : (metadata?.estimatedMass || 0);

      const minutes = estimatePrintTime(vol, lh, PRINTER_PROFILES.find(p => p.id === this._selectedPrinter)?.speed || 60, infill);
      const cost = estimateCost(grams, price);

      const resTime = container.querySelector('#res-time');
      const resGrams = container.querySelector('#res-grams');
      const resCost = container.querySelector('#res-cost');
      const resTemps = container.querySelector('#res-temps');

      if (resTime) resTime.textContent = fmtPrintTime(minutes);
      if (resGrams) resGrams.textContent = grams > 0 ? `${grams.toFixed(1)} g` : '—';
      if (resCost) resCost.textContent = grams > 0 ? `$${cost.toFixed(2)}` : '—';
      if (resTemps) {
        if (mat.nozzleTemp) {
          resTemps.textContent = `${mat.nozzleTemp}°C / ${mat.bedTemp}°C`;
        } else {
          resTemps.textContent = 'UV cure';
        }
      }
    };

    // Bind calculator controls
    container.querySelector('#calc-layer')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value).toFixed(2);
      const span = container.querySelector('#lh-val');
      if (span) span.textContent = val;
      updateCalc();
    });

    container.querySelector('#calc-infill')?.addEventListener('input', (e) => {
      const span = container.querySelector('#inf-val');
      if (span) span.textContent = e.target.value;
      updateCalc();
    });

    container.querySelector('#calc-material')?.addEventListener('change', updateCalc);
    container.querySelector('#calc-price')?.addEventListener('input', updateCalc);

    // Bind printer profile cards
    container.querySelectorAll('.printer-profile-card').forEach(card => {
      card.addEventListener('click', () => {
        this._selectedPrinter = card.dataset.printer;
        container.querySelectorAll('.printer-profile-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        updateCalc();
      });
    });

    // Initial calculation
    updateCalc();

    // Export handlers
    const on = (sel, fn) => container.querySelector(sel)?.addEventListener('click', fn);

    on('#exp-stl', () => {
      if (!mesh) { toast.warning('No model to export'); return; }
      try {
        const name = exportManager.exportSTL(mesh, partName);
        toast.success(`Downloaded: ${name}`);
      } catch (e) { toast.error('STL export failed: ' + e.message); }
    });

    on('#exp-scad', () => {
      const src = state.get('currentOpenSCAD');
      if (!src) { toast.warning('No OpenSCAD source available'); return; }
      try {
        const name = exportManager.exportOpenSCAD(src, partName);
        toast.success(`Downloaded: ${name}`);
      } catch (e) { toast.error('Export failed: ' + e.message); }
    });

    on('#exp-bambu', () => {
      try {
        const name = exportManager.exportBambuSheet(brief, metadata, validationReport, partName);
        toast.success(`Downloaded: ${name}`);
      } catch (e) { toast.error('Export failed: ' + e.message); }
    });

    on('#exp-makerworld', () => {
      try {
        const name = exportManager.exportMakerWorld(brief, metadata, partName);
        toast.success(`Downloaded: ${name}`);
      } catch (e) { toast.error('Export failed: ' + e.message); }
    });

    on('#exp-params', () => {
      try {
        const genId = state.get('selectedPartType');
        const name = exportManager.exportParametricJSON(brief, genId, params, metadata, partName);
        toast.success(`Downloaded: ${name}`);
      } catch (e) { toast.error('Export failed: ' + e.message); }
    });

    on('#exp-summary', () => {
      try {
        const part = { name: partType };
        const name = exportManager.exportJobSummary(project, part, brief, metadata, validationReport, partName);
        toast.success(`Downloaded: ${name}`);
      } catch (e) { toast.error('Export failed: ' + e.message); }
    });

    on('#exp-confidence', () => {
      try {
        const name = exportManager.exportConfidenceSummary(analysisResult, answers, partName);
        toast.success(`Downloaded: ${name}`);
      } catch (e) { toast.error('Export failed: ' + e.message); }
    });

    on('#back-preview-btn', () => router.navigate(`/project/${id}/preview`));
    on('#new-project-btn', () => {
      state.reset();
      router.navigate('/dashboard');
    });

    await projectsStore.update(id, { status: 'done' }).catch(() => {});
  },

  unmount() {}
};

export default exportView;
