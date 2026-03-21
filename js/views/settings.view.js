import settingsStore from '../db/settings.store.js';
import bus from '../bus.js';
import toast from '../components/toast.component.js';

const MODELS = [
  { value: 'anthropic/claude-3-haiku',       label: 'Claude 3 Haiku (fast, affordable)' },
  { value: 'anthropic/claude-3-sonnet',      label: 'Claude 3 Sonnet (balanced)' },
  { value: 'anthropic/claude-3-opus',        label: 'Claude 3 Opus (highest quality)' },
  { value: 'anthropic/claude-3.5-haiku',     label: 'Claude 3.5 Haiku (fast, vision)' },
  { value: 'anthropic/claude-3.5-sonnet',    label: 'Claude 3.5 Sonnet (recommended)' },
  { value: 'openai/gpt-4o-mini',             label: 'GPT-4o mini (fast, affordable)' },
  { value: 'openai/gpt-4o',                  label: 'GPT-4o (high quality, vision)' },
  { value: 'google/gemini-flash-1.5',        label: 'Gemini Flash 1.5 (free tier)' },
  { value: 'google/gemini-pro-1.5',          label: 'Gemini Pro 1.5 (vision)' },
  { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free, vision)' },
  { value: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B (free)' },
  { value: 'microsoft/phi-3-mini-128k-instruct:free', label: 'Phi-3 Mini 128K (free)' },
];

const settingsView = {
  async mount(container) {
    const settings = await settingsStore.getAll();
    this._render(container, settings);
    bus.emit('state:changed', {});
  },

  _render(container, settings) {
    container.innerHTML = `
      <div class="page page-enter">
        <div class="page-header">
          <h2>Settings</h2>
          <p>Configure AI provider and app preferences</p>
        </div>

        <!-- AI Provider -->
        <div class="glass-panel p-5 mb-4">
          <h3 class="mb-1">AI Analysis</h3>
          <p class="text-sm mb-4">Connect an AI provider for enhanced design analysis. Without a key, the offline rule-based engine is used.</p>

          <div class="form-group mb-4">
            <label class="form-label">Mode</label>
            <div class="select-wrapper">
              <select class="input input-select" id="ai-mode">
                <option value="auto" ${settings.aiMode === 'auto' ? 'selected' : ''}>Auto (AI if available, else offline)</option>
                <option value="deterministic" ${settings.aiMode === 'deterministic' ? 'selected' : ''}>Offline only (no AI calls)</option>
                <option value="ai-only" ${settings.aiMode === 'ai-only' ? 'selected' : ''}>AI only (fail if unavailable)</option>
              </select>
            </div>
          </div>

          <div class="form-group mb-4">
            <label class="form-label" for="or-key">OpenRouter API Key</label>
            <input class="input" type="password" id="or-key" placeholder="sk-or-v1-…" value="${settings.openrouterApiKey || ''}" autocomplete="off">
            <p class="form-hint">Get a free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style="color:var(--color-accent)">openrouter.ai/keys</a>. Several models have a free tier. Key stored locally on your device only.</p>
          </div>

          <div class="form-group mb-4">
            <label class="form-label">AI Model</label>
            <div class="select-wrapper">
              <select class="input input-select" id="ai-model">
                ${MODELS.map(m => `<option value="${m.value}" ${settings.openrouterModel === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
              </select>
            </div>
            <p class="form-hint">Vision-capable models can analyze your reference photos.</p>
          </div>

          <button class="btn btn-primary" id="save-ai-btn">Save AI Settings</button>
        </div>

        <!-- Units -->
        <div class="glass-panel p-5 mb-4">
          <h3 class="mb-4">Units</h3>
          <div class="toggle-group">
            <input type="radio" name="units-pref" id="u-mm" value="mm" class="toggle-option" ${settings.units !== 'in' ? 'checked' : ''}>
            <label for="u-mm" class="toggle-label">Millimeters (mm)</label>
            <input type="radio" name="units-pref" id="u-in" value="in" class="toggle-option" ${settings.units === 'in' ? 'checked' : ''}>
            <label for="u-in" class="toggle-label">Inches (in)</label>
          </div>
        </div>

        <!-- Display preferences -->
        <div class="glass-panel p-5 mb-4">
          <h3 class="mb-4">Display</h3>

          <div class="form-group mb-3">
            <div class="flex-between">
              <label class="form-label">Show AI Assumptions Panel</label>
              <input type="checkbox" id="show-assumptions" ${settings.showAssumptions ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-accent)">
            </div>
          </div>
          <div class="form-group">
            <div class="flex-between">
              <label class="form-label">Show "Why this design?" Panel</label>
              <input type="checkbox" id="show-why" ${settings.showWhyPanel ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--color-accent)">
            </div>
          </div>
        </div>

        <!-- App info -->
        <div class="glass-panel p-5 mb-4">
          <h3 class="mb-3">About</h3>
          <div class="info-row"><span class="info-row-label">Version</span><span class="info-row-value">v2.0.0</span></div>
          <div class="info-row"><span class="info-row-label">Storage</span><span class="info-row-value">IndexedDB (local)</span></div>
          <div class="info-row"><span class="info-row-label">AI</span><span class="info-row-value">OpenRouter (optional)</span></div>
          <div class="info-row"><span class="info-row-label">3D Preview</span><span class="info-row-value">Three.js</span></div>
          <p class="text-xs text-dim mt-3">All data is stored locally on this device. No data is sent to any server unless AI analysis is enabled.</p>
        </div>
      </div>
    `;

    // Save AI settings
    container.querySelector('#save-ai-btn').addEventListener('click', async () => {
      const key = container.querySelector('#or-key').value.trim();
      const model = container.querySelector('#ai-model').value;
      const mode = container.querySelector('#ai-mode').value;

      await settingsStore.setMany({ openrouterApiKey: key, openrouterModel: model, aiMode: mode });

      if (key) sessionStorage.setItem('or_key_cached', '1');
      else sessionStorage.removeItem('or_key_cached');

      toast.success('AI settings saved');
    });

    // Units
    container.querySelectorAll('[name="units-pref"]').forEach(radio => {
      radio.addEventListener('change', () => settingsStore.set('units', radio.value));
    });

    // Display prefs
    container.querySelector('#show-assumptions').addEventListener('change', (e) => {
      settingsStore.set('showAssumptions', e.target.checked);
    });
    container.querySelector('#show-why').addEventListener('change', (e) => {
      settingsStore.set('showWhyPanel', e.target.checked);
    });
  },

  unmount() {}
};

export default settingsView;
