import router from '../router.js';
import state from '../state.js';
import toast from '../components/toast.component.js';
import photoCapture from '../components/photo-capture.component.js';
import partsStore from '../db/parts.store.js';
import projectsStore from '../db/projects.store.js';
import settingsStore from '../db/settings.store.js';
import { PIPELINE_STEPS, pipelineNav } from './_pipeline.js';
import { haptic, attachKeyboardScrolling } from '../utils/mobile.js';

const intake = {
  async mount(container, { id }) {
    state.set('currentProjectId', id);
    const project = await projectsStore.get(id);
    const units = await settingsStore.get('units');

    const existing = state.get('intake');
    const u = units === 'in' ? 'in' : 'mm';

    container.innerHTML = `
      <div class="page page-enter">
        ${pipelineNav('intake', id)}
        <div class="page-header">
          <h2>What are you building?</h2>
          <p>Describe it, add photos, and enter any known measurements.</p>
        </div>

        <!-- Photo capture -->
        <div class="page-section">
          <div class="flex-between mb-3">
            <div class="page-section-title" style="margin-bottom:0">
              Reference Photos
              <span class="badge badge-muted" style="margin-left:6px;vertical-align:middle;font-size:0.65rem">optional</span>
            </div>
            <span class="badge badge-ai" style="font-size:0.65rem">✦ AI Vision</span>
          </div>
          <p class="text-xs text-muted mb-3" style="line-height:1.5">
            Upload photos of what you want to build or reference objects. The AI will extract shapes, dimensions, hole patterns, and features directly from the images — even without measurements.
          </p>
          <div id="photo-container"></div>
        </div>

        <!-- Description -->
        <div class="page-section">
          <div class="form-group">
            <label class="form-label" for="description">Describe what you want to build</label>
            <textarea class="input" id="description" rows="4"
              placeholder="E.g. 'A bracket to mount a 65mm tube to a wall. Needs to hold 2 kg. M5 bolt pattern.'"
              enterkeyhint="next"
              autocomplete="off"
            >${existing.description || ''}</textarea>
            <span class="form-hint">Function, what it attaches to, size constraints, existing hardware it mates with.</span>
          </div>
        </div>

        <!-- Measurements -->
        <div class="page-section">
          <div class="flex-between mb-3">
            <div class="page-section-title" style="margin-bottom:0">Key Measurements</div>
            <div class="toggle-group">
              <input type="radio" name="units" id="u-mm" value="mm" class="toggle-option" ${u !== 'in' ? 'checked' : ''}>
              <label for="u-mm" class="toggle-label">mm</label>
              <input type="radio" name="units" id="u-in" value="in" class="toggle-option" ${u === 'in' ? 'checked' : ''}>
              <label for="u-in" class="toggle-label">in</label>
            </div>
          </div>
          <p class="text-sm text-muted mb-4">Leave blank for any dimensions you don't know — the AI will ask.</p>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="m-width">Width</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-width" inputmode="decimal"
                  placeholder="—" min="0" step="0.1" autocomplete="off" enterkeyhint="next"
                  value="${existing.measurements?.width || ''}">
                <span class="input-unit" id="unit-w">${u}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="m-depth">Depth / Length</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-depth" inputmode="decimal"
                  placeholder="—" min="0" step="0.1" autocomplete="off" enterkeyhint="next"
                  value="${existing.measurements?.depth || ''}">
                <span class="input-unit" id="unit-d">${u}</span>
              </div>
            </div>
          </div>
          <div class="form-row mt-3">
            <div class="form-group">
              <label class="form-label" for="m-height">Height</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-height" inputmode="decimal"
                  placeholder="—" min="0" step="0.1" autocomplete="off" enterkeyhint="next"
                  value="${existing.measurements?.height || ''}">
                <span class="input-unit" id="unit-h">${u}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="m-dia">Diameter (if round)</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-dia" inputmode="decimal"
                  placeholder="—" min="0" step="0.1" autocomplete="off" enterkeyhint="next"
                  value="${existing.measurements?.diameter || ''}">
                <span class="input-unit" id="unit-dia">${u}</span>
              </div>
            </div>
          </div>
          <div class="form-row mt-3">
            <div class="form-group">
              <label class="form-label" for="m-thick">Wall thickness</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-thick" inputmode="decimal"
                  placeholder="—" min="0" step="0.1" autocomplete="off" enterkeyhint="next"
                  value="${existing.measurements?.thickness || ''}">
                <span class="input-unit">${u}</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="m-other">Other dimension</label>
              <div class="input-unit-wrapper">
                <input class="input" type="number" id="m-other" inputmode="decimal"
                  placeholder="—" min="0" step="0.1" autocomplete="off" enterkeyhint="done"
                  value="${existing.measurements?.other || ''}">
                <span class="input-unit">${u}</span>
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-full btn-lg mt-4" id="continue-btn">
          Continue to Questions
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    `;

    // Photo capture
    const pc = photoCapture.create(existing.photos || [], (photos) => {
      state.set('intake.photos', photos);
    });
    pc.mount(container.querySelector('#photo-container'));

    // Scroll-into-view on input focus (iOS keyboard avoidance)
    attachKeyboardScrolling(container);

    // Units toggle
    container.querySelectorAll('[name="units"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const u = radio.value;
        settingsStore.set('units', u);
        const label = u === 'in' ? 'in' : 'mm';
        container.querySelectorAll('.input-unit').forEach(el => el.textContent = label);
        haptic('light');
      });
    });

    // Continue button
    container.querySelector('#continue-btn').addEventListener('click', async () => {
      const description = container.querySelector('#description').value.trim();
      if (!description) {
        container.querySelector('#description').classList.add('error');
        container.querySelector('#description').focus();
        toast.warning('Please describe what you want to build.');
        haptic('error');
        return;
      }
      container.querySelector('#description').classList.remove('error');

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

      haptic('medium');

      // Save to DB
      try {
        let partId = state.get('currentPartId');
        let projectUpdates = { status: 'questions' };
        if (partId) {
          await partsStore.update(partId, { intake: intakeData });
        } else {
          const part = await partsStore.create(id, { name: description.slice(0, 40), intake: intakeData });
          state.set('currentPartId', part.id);
          // Update project part count when creating a new part
          const allParts = await partsStore.getByProject(id);
          projectUpdates.partCount = allParts.length;
        }
        await projectsStore.update(id, projectUpdates);
      } catch (e) {
        console.warn('Could not save intake:', e);
      }

      router.navigate(`/project/${id}/questions`);
    });
  },

  unmount() {}
};

export default intake;
