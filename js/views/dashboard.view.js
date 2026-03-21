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
    container.innerHTML = `
      <div class="page page-enter">
        <div class="page-header flex-between">
          <div>
            <h1>My Projects</h1>
            <p>${projects.length} project${projects.length !== 1 ? 's' : ''}</p>
          </div>
          <div class="flex gap-2">
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

        ${projects.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
            </div>
            <h3>No Projects Yet</h3>
            <p>Tap the button above to start your first AI-assisted CAD design.</p>
            <button class="btn btn-primary mt-4" id="new-project-empty">
              Start Designing
            </button>
          </div>
        ` : `
          <div class="stagger-children">
            ${projects.map(p => projectCard(p)).join('')}
          </div>
        `}

        <input type="file" id="stl-file-input" accept=".stl" style="display:none">
      </div>
    `;

    // Bind new project button
    container.querySelector('#new-project-btn')?.addEventListener('click', () => this._createProject());
    container.querySelector('#new-project-empty')?.addEventListener('click', () => this._createProject());

    // Import STL button
    const importBtn = container.querySelector('#import-stl-btn');
    const fileInput = container.querySelector('#stl-file-input');
    importBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this._importSTL(file);
      fileInput.value = '';
    });

    // Bind project card clicks
    container.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-delete]')) return;
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
