/**
 * Share view — decodes a ?d=<base64> design link and loads it into a new project.
 * Route: #/share?d=<encoded>
 */
import router from '../router.js';
import state from '../state.js';
import toast from '../components/toast.component.js';
import projectsStore from '../db/projects.store.js';
import partsStore from '../db/parts.store.js';
import bus from '../bus.js';

const shareView = {
  async mount(container) {
    // Decode payload from URL
    const hash   = window.location.hash; // e.g. #/share?d=<base64>
    const match  = hash.match(/[?&]d=([^&]+)/);
    const encoded = match?.[1];

    container.innerHTML = `
      <div class="page page-enter flex-center flex-col" style="min-height:60vh;gap:1rem">
        <div class="spinner spinner-lg"></div>
        <p class="text-muted">Opening shared design…</p>
      </div>
    `;
    bus.emit('state:changed', {});

    if (!encoded) {
      this._showError(container, 'Invalid share link — no design data found.');
      return;
    }

    let payload;
    try {
      payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    } catch {
      this._showError(container, 'Could not decode share link. It may be corrupted or from a different version.');
      return;
    }

    if (!payload?.v || !payload?.g || !payload?.p) {
      this._showError(container, 'Share link is missing required design data.');
      return;
    }

    try {
      const name = payload.b?.object_type
        ? `Shared: ${payload.b.object_type}`
        : 'Shared Design';

      // Create a project for this shared design
      const project = await projectsStore.create({
        name,
        description: `Loaded from a share link. Generator: ${payload.g}`,
      });
      const part = await partsStore.create(project.id, {
        name,
        intake: {
          photos: [],
          description: name,
          measurements: payload.b?.dimensions || {},
        },
        brief: payload.b ? {
          object_type:           payload.b.object_type || name,
          recommended_generator: payload.g,
          material_recommendation: payload.b.material_recommendation || 'PLA',
          dimensions:            payload.b.dimensions || {},
        } : null,
        partType:        payload.g,
        generatorParams: payload.p,
      });

      state.reset();
      state.set('currentProjectId', project.id);
      state.set('currentPartId', part.id);
      state.set('selectedPartType', payload.g);
      state.set('generatorParams', payload.p);
      if (payload.b) {
        state.set('brief', {
          object_type:           payload.b.object_type || name,
          recommended_generator: payload.g,
          material_recommendation: payload.b.material_recommendation || 'PLA',
          dimensions:            payload.b.dimensions || {},
        });
      }

      toast.success(`Shared design loaded: ${name}`);
      router.navigate(`/project/${project.id}/generator`);
    } catch (e) {
      console.error('[share]', e);
      this._showError(container, 'Failed to load shared design: ' + e.message);
    }
  },

  _showError(container, msg) {
    container.innerHTML = `
      <div class="page page-enter">
        <div class="glass-panel p-6 mt-8 text-center">
          <div style="font-size:2.5rem;margin-bottom:1rem">🔗</div>
          <h3 class="text-error mb-2">Share Link Error</h3>
          <p class="text-muted mb-4">${msg}</p>
          <button class="btn btn-primary" id="go-home">Go to Dashboard</button>
        </div>
      </div>
    `;
    bus.emit('state:changed', {});
    container.querySelector('#go-home')?.addEventListener('click', () => router.navigate('/dashboard'));
  },

  unmount() {}
};

export default shareView;
