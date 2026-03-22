import router from '../router.js';
import state from '../state.js';
import bus from '../bus.js';
import projectsStore from '../db/projects.store.js';
import partsStore from '../db/parts.store.js';
import { projectCard } from '../components/card.component.js';
import skeleton from '../components/skeleton.component.js';
import modal from '../components/modal.component.js';
import toast from '../components/toast.component.js';
import { parseSTL } from '../stl/stl-reader.js';

const TEMPLATES = [
  { id: 'wall-mount',   name: 'Wall Mount',       desc: 'Printable bracket or holder for walls.',       icon: '🔩' },
  { id: 'enclosure',    name: 'Enclosure / Box',   desc: 'Lid + base enclosure for electronics.',        icon: '📦' },
  { id: 'cable-clip',   name: 'Cable Clip',        desc: 'Route and organise cables cleanly.',           icon: '🔌' },
  { id: 'stand',        name: 'Stand / Riser',     desc: 'Phone, tablet, or device stand.',              icon: '📱' },
  { id: 'jig',          name: 'Jig / Fixture',     desc: 'Alignment or drilling jig for workshop use.',  icon: '🔧' },
  { id: 'cover',        name: 'Cover / Cap',       desc: 'Protective cap or cover for an opening.',      icon: '🛡️' },
];

const dashboard = {
  _unsub: null,

  async mount(container) {
    container.innerHTML = skeleton.fullPage();

    let projects = [];
    try {
      projects = await projectsStore.getAll();
    } catch (e) {
      toast.error('Failed to load projects');
    }

    this._render(container, projects);
    state.set('currentProjectId', null);

    this._unsub = bus.on('project:saved', async () => {
      projects = await projectsStore.getAll();
      this._render(container, projects);
    });

    bus.on('project:deleted', async () => {
      projects = await projectsStore.getAll();
      this._render(container, projects);
    });

    // Emit state changed so loading screen hides
    bus.emit('state:changed', {});
  },

  _render(container, projects) {
    const showSearch = projects.length > 3;

    container.innerHTML = `
      <div class="page page-enter">
        <div class="page-header flex-between">
          <div>
            <h1>My Projects</h1>
            <p>${projects.length} project${projects.length !== 1 ? 's' : ''}</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-glass btn-sm" id="templates-btn" title="Start from a template">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Templates
            </button>
            <button class="btn btn-glass btn-sm" id="import-stl-btn" title="Import STL file">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Import STL
            </button>
            <button class="btn btn-primary" id="new-project-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New
            </button>
          </div>
        </div>

        ${showSearch ? `
          <div class="search-bar-wrap">
            <div class="search-bar-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input class="search-input" id="project-search" type="search" placeholder="Search projects…" autocomplete="off">
            </div>
          </div>
        ` : ''}

        ${projects.length === 0 ? `
          <div class="empty-state">
            <div class="empty-hero">
              <div class="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
              </div>
              <h3>No Projects Yet</h3>
              <p>Describe what you need — Micas designs it for your 3D printer.</p>
              <button class="btn btn-primary mt-4" id="new-project-empty">
                Start Designing
              </button>
            </div>
            <div class="feature-cards mt-4">
              <div class="feature-card">
                <div class="feature-card-icon">💬</div>
                <div class="feature-card-title">Describe It</div>
                <div class="feature-card-body">Tell Micas what you need in plain language — no CAD skills required.</div>
              </div>
              <div class="feature-card">
                <div class="feature-card-icon">🤖</div>
                <div class="feature-card-title">AI Designs It</div>
                <div class="feature-card-body">AI asks smart questions then generates parametric OpenSCAD geometry.</div>
              </div>
              <div class="feature-card">
                <div class="feature-card-icon">🖨️</div>
                <div class="feature-card-title">Print It</div>
                <div class="feature-card-body">Export a validated STL ready for Bambu, Prusa, Cura, or any slicer.</div>
              </div>
            </div>
          </div>
        ` : `
          <div class="stagger-children" id="project-grid">
            ${projects.map(p => projectCard(p)).join('')}
          </div>
          <div id="search-empty" class="empty-state" style="display:none">
            <p class="text-muted">No projects match your search.</p>
          </div>
        `}

        <input type="file" id="stl-file-input" accept=".stl" style="display:none">
      </div>
    `;

    // Bind new project button
    container.querySelector('#new-project-btn')?.addEventListener('click', () => this._createProject());
    container.querySelector('#new-project-empty')?.addEventListener('click', () => this._createProject());

    // Templates button
    container.querySelector('#templates-btn')?.addEventListener('click', () => this._openTemplates());

    // Import STL button
    const importBtn = container.querySelector('#import-stl-btn');
    const fileInput = container.querySelector('#stl-file-input');
    importBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this._importSTL(file);
      fileInput.value = '';
    });

    // Search
    const searchInput = container.querySelector('#project-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        const grid = container.querySelector('#project-grid');
        const emptyMsg = container.querySelector('#search-empty');
        if (!grid) return;
        let visible = 0;
        grid.querySelectorAll('.project-card').forEach(card => {
          const name = (card.dataset.name || '').toLowerCase();
          const matches = !q || name.includes(q);
          card.style.display = matches ? '' : 'none';
          if (matches) visible++;
        });
        if (emptyMsg) emptyMsg.style.display = (visible === 0 && q) ? '' : 'none';
      });
    }

    // Bind project card clicks
    container.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete]') || e.target.closest('[data-duplicate]')) return;
        const id = card.dataset.id;
        if (id) this._openProject(id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = card.dataset.id;
          if (id) this._openProject(id);
        }
      });
    });

    // Bind delete buttons
    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.delete;
        const confirmed = await modal.confirm({
          title: 'Delete Project',
          body: 'This will permanently delete the project and all its parts.',
          confirmText: 'Delete',
          danger: true
        });
        if (confirmed) {
          await projectsStore.delete(id);
          toast.success('Project deleted');
          bus.emit('project:deleted', { id });
        }
      });
    });

    // Bind duplicate buttons
    container.querySelectorAll('[data-duplicate]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.duplicate;
        await this._duplicateProject(id);
      });
    });
  },

  async _duplicateProject(id) {
    try {
      const original = await projectsStore.get(id);
      if (!original) { toast.error('Project not found'); return; }

      const newName = `${original.name} (copy)`;
      const newProject = await projectsStore.create({
        name: newName,
        description: original.description || '',
        status: original.status,
      });

      const parts = await partsStore.getByProject(id);
      for (const part of parts) {
        const { id: _pid, projectId: _proj, createdAt: _c, updatedAt: _u, ...partData } = part;
        await partsStore.create(newProject.id, partData);
      }

      await projectsStore.update(newProject.id, { partCount: original.partCount || 0 });

      toast.success(`Duplicated: ${newName}`);
      bus.emit('project:saved', { id: newProject.id });
    } catch (e) {
      toast.error('Duplicate failed: ' + e.message);
      console.error('[dashboard] duplicate error:', e);
    }
  },

  async _openTemplates() {
    const overlay = modal.custom(`
      <h2 class="modal-title">Start from a Template</h2>
      <p class="modal-body">Choose a starting point — you can customise everything next.</p>
      <div class="mt-4" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${TEMPLATES.map(t => `
          <button class="btn btn-glass" style="text-align:left;padding:14px 16px;display:flex;gap:12px;align-items:flex-start" data-template="${t.id}">
            <span style="font-size:1.5rem;flex-shrink:0">${t.icon}</span>
            <span>
              <div style="font-weight:600;font-size:0.9375rem">${t.name}</div>
              <div style="font-size:0.8125rem;color:var(--color-text-muted);margin-top:2px">${t.desc}</div>
            </span>
          </button>
        `).join('')}
      </div>
      <div class="modal-actions mt-4">
        <button class="btn btn-glass btn-full" id="tpl-cancel-btn">Cancel</button>
      </div>
    `);

    overlay.querySelector('#tpl-cancel-btn').addEventListener('click', () => overlay.remove());

    overlay.querySelectorAll('[data-template]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tplId = btn.dataset.template;
        const tpl = TEMPLATES.find(t => t.id === tplId);
        if (!tpl) return;
        overlay.remove();

        try {
          const project = await projectsStore.create({ name: tpl.name, description: tpl.desc });
          state.reset();
          state.set('currentProjectId', project.id);
          state.set('intake', { description: tpl.desc, measurements: {}, photos: [] });
          toast.success(`Template loaded: ${tpl.name}`);
          router.navigate(`/project/${project.id}/intake`);
        } catch (e) {
          toast.error('Failed to create project from template');
        }
      });
    });
  },

  async _createProject() {
    const overlay = modal.custom(`
      <h2 class="modal-title">New Project</h2>
      <p class="modal-body">Give your project a name to get started.</p>
      <div class="form-group mt-4">
        <label class="form-label" for="proj-name">Project Name</label>
        <input class="input" id="proj-name" type="text" placeholder="e.g. Phone wall mount" maxlength="80" autofocus>
      </div>
      <div class="form-group mt-3">
        <label class="form-label" for="proj-desc">Description (optional)</label>
        <textarea class="input" id="proj-desc" placeholder="Brief description of what you're designing…" rows="2"></textarea>
      </div>
      <div class="modal-actions mt-4">
        <button class="btn btn-primary btn-full" id="create-btn">Create Project</button>
        <button class="btn btn-glass btn-full" id="cancel-btn">Cancel</button>
      </div>
    `);

    const createBtn = overlay.querySelector('#create-btn');
    const cancelBtn = overlay.querySelector('#cancel-btn');
    const nameInput = overlay.querySelector('#proj-name');
    const descInput = overlay.querySelector('#proj-desc');

    nameInput.focus();

    cancelBtn.addEventListener('click', () => overlay.remove());

    createBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.style.borderColor = 'var(--color-error)'; return; }

      createBtn.disabled = true;
      createBtn.innerHTML = '<span class="spinner spinner-sm"></span> Creating…';

      try {
        const project = await projectsStore.create({ name, description: descInput.value.trim() });
        overlay.remove();
        state.reset();
        state.set('currentProjectId', project.id);
        toast.success('Project created!');
        router.navigate(`/project/${project.id}/intake`);
      } catch (e) {
        toast.error('Failed to create project');
        createBtn.disabled = false;
        createBtn.textContent = 'Create Project';
      }
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createBtn.click();
    });
  },

  async _openProject(id) {
    // Load the most recent part data BEFORE resetting state,
    // so we can restore everything in one clean pass.
    let latestPart = null;
    try {
      const parts = await partsStore.getByProject(id);
      if (parts.length > 0) {
        latestPart = parts.reduce((a, b) => (b.updatedAt > a.updatedAt ? b : a));
      }
    } catch (e) {
      console.warn('[dashboard] Could not load part state:', e);
    }

    state.reset();
    state.set('currentProjectId', id);

    if (latestPart) {
      state.set('currentPartId', latestPart.id);
      if (latestPart.intake?.description) state.set('intake', latestPart.intake);
      if (latestPart.answers?.length) state.set('answers', latestPart.answers);
      if (latestPart.brief) {
        state.set('brief', latestPart.brief);
        state.set('confidence', latestPart.confidence || 0);
        state.set('assumptions', latestPart.assumptions || []);
        state.set('aiProvider', latestPart.aiProvider || null);
      }
      if (latestPart.partType) state.set('selectedPartType', latestPart.partType);
      if (latestPart.generatorParams && Object.keys(latestPart.generatorParams).length) {
        state.set('generatorParams', latestPart.generatorParams);
      }
      if (latestPart.openscadSource) state.set('currentOpenSCAD', latestPart.openscadSource);
      if (latestPart.metadata && Object.keys(latestPart.metadata).length) {
        state.set('currentMetadata', latestPart.metadata);
      }
    }

    router.navigate(`/project/${id}/intake`);
  },

  async _importSTL(file) {
    try {
      const buffer = await file.arrayBuffer();
      const mesh = parseSTL(buffer);
      if (!mesh || !mesh.faces?.length) throw new Error('Empty or invalid STL');

      // Create a quick project for the imported STL
      const name = file.name.replace(/\.stl$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Imported STL';
      const project = await projectsStore.create({ name, description: `Imported from ${file.name}` });
      const part = await partsStore.create(project.id, {
        name,
        intake: { photos: [], description: `Imported from ${file.name}`, measurements: {} },
        metadata: {
          triangleCount: mesh.faces.length,
          generatorId: 'import',
        },
      });
      await projectsStore.update(project.id, { status: 'preview', partCount: 1 });

      state.reset();
      state.set('currentProjectId', project.id);
      state.set('currentPartId', part.id);
      state.set('currentMesh', mesh);
      state.set('currentMetadata', part.metadata);
      state.set('selectedPartType', 'import');

      toast.success(`Imported: ${name}`);
      router.navigate(`/project/${project.id}/preview`);
    } catch (e) {
      toast.error('STL import failed: ' + e.message);
      console.error('[STL import]', e);
    }
  },

  unmount() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }
};

export default dashboard;
