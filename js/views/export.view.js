import router from '../router.js';
import state from '../state.js';
import bus from '../bus.js';
import exportManager from '../export/export.manager.js';
import toast from '../components/toast.component.js';
import { pipelineNav } from './_pipeline.js';
import { fmtVolume, fmtMass, fmtDate } from '../utils/format.utils.js';
import projectsStore from '../db/projects.store.js';

const exportView = {
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

    // Export handlers
    const on = (id, fn) => container.querySelector(id)?.addEventListener('click', fn);

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
