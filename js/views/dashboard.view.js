import router from '../router.js';
import state from '../state.js';
import bus from '../bus.js';
import projectsStore from '../db/projects.store.js';
import { projectCard } from '../components/card.component.js';
import skeleton from '../components/skeleton.component.js';
import modal from '../components/modal.component.js';
import toast from '../components/toast.component.js';

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
          <button class="btn btn-primary" id="new-project-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
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
      </div>
    `;

    // Bind new project button
    container.querySelector('#new-project-btn')?.addEventListener('click', () => this._createProject());
    container.querySelector('#new-project-empty')?.addEventListener('click', () => this._createProject());

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

  _openProject(id) {
    state.reset();
    state.set('currentProjectId', id);
    router.navigate(`/project/${id}/intake`);
  },

  unmount() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }
};

export default dashboard;
