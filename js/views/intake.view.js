import router from '../router.js';
import state from '../state.js';
import toast from '../components/toast.component.js';
import photoCapture from '../components/photo-capture.component.js';
import partsStore from '../db/parts.store.js';
import projectsStore from '../db/projects.store.js';
import settingsStore from '../db/settings.store.js';
import { PIPELINE_STEPS, pipelineNav } from './_pipeline.js';

const intake = {
  async mount(container, { id }) {
    state.set('currentProjectId', id);
    const project = await projectsStore.get(id);
    const units = await settingsStore.get('units');

    const existing = state.get('intake');

    container.innerHTML = `
      <div class="page page-enter">
        ${pipelineNav('intake', id)}
        <div class="page-header">
          <h2>Design Intake</h2>
          <p>Tell me what you want to build. The more detail, the better.</p>
        </div>

        <!-- Photo capture -->
        <div class="page-section">
          <div class="page-section-title">Reference Photos (optional)</div>
          <p class="text-sm mb-3">Add photos of the object to replace, fit around, or get inspired by.</p>
          <div id="photo-container"></div>
        </div>

        <!-- Description -->
        <div class="page-section">
          <div class="form-group">
            <label class="form-label" for="description">What do you want to build?</label>
            <textarea class="input" id="description" rows="4"
              placeholder="Describe what this part should do. E.g. 'A bracket to mount a 65mm diameter tube to a wall, needs to hold 2kg, screw mount with M5 bolts'"
            >${existing.description || ''}</textarea>
            <span class="form-hint">Be specific about function, what it attaches to, size constraints, and any existing hardware it mates with.</span>
          </div>
        </div>

        <!-- Measurements -->
        <div class="page-section">
          <div class="page-section-title">Key Measurements</div>
          <p class="text-sm mb-3">Enter any known dimensions. Unknown fields are fine — the AI will ask.</p>

          <div class="flex-between mb-3">
            <span class="text-sm text-muted">Units</span>
            <div class="toggle-group">
              <input type="radio" name="units" id="u-mm" value="mm" class="toggle-option" ${units !== 'in' ? 'checked' : ''}>
              <label for="u-mm" class="toggle-label">mm</label>
              <input type="radio" name="units" id="u-in" value="in" class="toggle-option" ${units === 'in' ? 'checked' : ''}>
              <label for="u-in" class="toggle-label">inches</label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Width</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-width" placeholder="—" min="0" step="0.1" value="${existing.measurements?.width || ''}">
                <span class="input-unit" id="unit-w">${units === 'in' ? 'in' : 'mm'}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Depth / Length</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-depth" placeholder="—" min="0" step="0.1" value="${existing.measurements?.depth || ''}">
                <span class="input-unit" id="unit-d">${units === 'in' ? 'in' : 'mm'}</span>
              </div>
            </div>
          </div>
          <div class="form-row mt-3">
            <div class="form-group">
              <label class="form-label">Height</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-height" placeholder="—" min="0" step="0.1" value="${existing.measurements?.height || ''}">
                <span class="input-unit" id="unit-h">${units === 'in' ? 'in' : 'mm'}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Diameter (if round)</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-dia" placeholder="—" min="0" step="0.1" value="${existing.measurements?.diameter || ''}">
                <span class="input-unit" id="unit-dia">${units === 'in' ? 'in' : 'mm'}</span>
              </div>
            </div>
          </div>
          <div class="form-row mt-3">
            <div class="form-group">
              <label class="form-label">Wall / Board thickness</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-thick" placeholder="—" min="0" step="0.1" value="${existing.measurements?.thickness || ''}">
                <span class="input-unit">${units === 'in' ? 'in' : 'mm'}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Other key dimension</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-other" placeholder="—" min="0" step="0.1" value="${existing.measurements?.other || ''}">
                <span class="input-unit">${units === 'in' ? 'in' : 'mm'}</span>
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-full btn-lg mt-6" id="continue-btn">
          Continue to Questions
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    `;

    // Photo capture
    const pc = photoCapture.create(existing.photos || [], (photos) => {
      state.set('intake.photos', photos);
    });
    pc.mount(container.querySelector('#photo-container'));

    // Units toggle
    container.querySelectorAll('[name="units"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const u = radio.value;
        settingsStore.set('units', u);
        container.querySelectorAll('.input-unit').forEach(el => el.textContent = u === 'in' ? 'in' : 'mm');
      });
    });

    // Continue button
    container.querySelector('#continue-btn').addEventListener('click', async () => {
      const description = container.querySelector('#description').value.trim();
      if (!description) {
        container.querySelector('#description').style.borderColor = 'var(--color-error)';
        toast.warning('Please describe what you want to build.');
        return;
      }

      const activeUnit = container.querySelector('[name="units"]:checked')?.value || 'mm';
      const inToMm = v => activeUnit === 'in' ? parseFloat(v || 0) * 25.4 : parseFloat(v || 0);

      const measurements = {
        width:    inToMm(container.querySelector('#m-width')?.value) || null,
        depth:    inToMm(container.querySelector('#m-depth')?.value) || null,
        height:   inToMm(container.querySelector('#m-height')?.value) || null,
        diameter: inToMm(container.querySelector('#m-dia')?.value) || null,
        thickness:inToMm(container.querySelector('#m-thick')?.value) || null,
        other:    inToMm(container.querySelector('#m-other')?.value) || null,
      };

      // Remove nulls
      Object.keys(measurements).forEach(k => { if (!measurements[k]) delete measurements[k]; });

      const intakeData = {
        photos: pc.getPhotos(),
        description,
        measurements
      };

      state.set('intake', intakeData);

      // Save to DB
      try {
        let partId = state.get('currentPartId');
        if (partId) {
          await partsStore.update(partId, { intake: intakeData });
        } else {
          const part = await partsStore.create(id, { name: description.slice(0, 40), intake: intakeData });
          state.set('currentPartId', part.id);
          partId = part.id;
        }
        await projectsStore.update(id, { status: 'questions' });
      } catch (e) {
        console.warn('Could not save intake:', e);
      }

      router.navigate(`/project/${id}/questions`);
    });
  },

  unmount() {}
};

export default intake;
