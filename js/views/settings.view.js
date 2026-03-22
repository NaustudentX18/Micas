import settingsStore from '../db/settings.store.js';
import bus from '../bus.js';
import toast from '../components/toast.component.js';
import aiManager from '../ai/ai.manager.js';
import { haptic } from '../utils/mobile.js';

const OPENROUTER_MODELS = [
  { value: 'anthropic/claude-3-5-haiku',   label: 'Claude 3.5 Haiku — Fast & smart' },
  { value: 'anthropic/claude-3-5-sonnet',  label: 'Claude 3.5 Sonnet — Best quality' },
  { value: 'openai/gpt-4o-mini',           label: 'GPT-4o mini — Fast' },
  { value: 'openai/gpt-4o',               label: 'GPT-4o — High quality + vision' },
  { value: 'google/gemini-flash-1.5',      label: 'Gemini Flash 1.5 — Fast + vision' },
  { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B — Open source' },
];

const OLLAMA_MODELS = [
  'llama3.2', 'llama3.1', 'mistral', 'deepseek-r1', 'phi3', 'gemma2', 'qwen2.5'
];

const settingsView = {
  async mount(container) {
    const settings = await settingsStore.getAll();
    this._render(container, settings);
    bus.emit('state:changed', {});

    // Check provider statuses in background
    this._refreshStatuses(container);
  },

  async _refreshStatuses(container) {
    try {
      const statuses = await aiManager.getProviderStatuses();
      this._updateStatusDots(container, statuses);
    } catch { /* silent */ }
  },

  _updateStatusDots(container, statuses) {
    Object.entries(statuses).forEach(([id, status]) => {
      const dot = container.querySelector(`[data-status="${id}"]`);
      if (!dot) return;
      dot.className = `status-dot ${status.available ? 'status-green' : status.hasKey ? 'status-yellow' : 'status-gray'}`;
      dot.title = status.available ? 'Available' : status.hasKey ? 'Key set, not reachable' : 'Not configured';
    });
  },

  _render(container, settings) {
    container.innerHTML = `
      <div class="page page-enter">
        <div class="page-header">
          <h2>Settings</h2>
          <p>AI providers and app preferences</p>
        </div>

        <!-- FREE AI SECTION -->
        <div class="page-section-title">
          Free AI — Works Now, No Setup
        </div>

        <!-- Groq (Built-in proxy) -->
        <div class="glass-panel p-5 mb-3">
          <div class="flex-between mb-1">
            <div class="flex gap-3 items-center">
              <span class="provider-icon">⚡</span>
              <div>
                <div class="font-semibold">Groq — Llama 3.1 70B</div>
                <div class="text-xs text-muted">10 analyses/hour free · Instant · No setup</div>
              </div>
            </div>
            <div class="flex gap-2 items-center">
              <span data-status="groq" class="status-dot status-gray"></span>
              <span class="badge badge-success">Built-in</span>
            </div>
          </div>
          <div class="form-group mt-3">
            <label class="form-label" for="groq-key">Your Groq Key (optional — removes rate limits)</label>
            <div class="flex gap-2">
              <input class="input flex-1" type="password" id="groq-key"
                placeholder="gsk_…" autocomplete="off"
                value="${settings.groqApiKey || ''}">
              <button class="btn btn-glass btn-sm" id="test-groq" style="flex-shrink:0">Test</button>
            </div>
            <p class="form-hint">
              Get a free key at <a href="https://console.groq.com" target="_blank" style="color:var(--color-accent)">console.groq.com</a>
            </p>
          </div>
        </div>

        <!-- Ollama (Local) -->
        <div class="glass-panel p-5 mb-3">
          <div class="flex-between mb-1">
            <div class="flex gap-3 items-center">
              <span class="provider-icon">🏠</span>
              <div>
                <div class="font-semibold">Ollama — Local AI</div>
                <div class="text-xs text-muted">100% private · No internet · Unlimited</div>
              </div>
            </div>
            <div class="flex gap-2 items-center">
              <span data-status="ollama" class="status-dot status-gray"></span>
              <span class="badge badge-muted" id="ollama-status-badge">Checking…</span>
            </div>
          </div>
          <div class="form-group mt-3">
            <label class="form-label" for="ollama-model">Local Model</label>
            <div class="select-wrapper">
              <select class="input input-select" id="ollama-model">
                ${OLLAMA_MODELS.map(m => `
                  <option value="${m}" ${settings.ollamaModel === m ? 'selected' : ''}>${m}</option>
                `).join('')}
                <option value="custom">Custom model name…</option>
              </select>
            </div>
            <p class="form-hint">
              Install Ollama from <a href="https://ollama.com" target="_blank" style="color:var(--color-accent)">ollama.com</a>, then run:
              <code style="display:block;margin-top:4px">ollama pull llama3.2</code>
            </p>
          </div>
          <div id="ollama-custom-model" class="form-group mt-2 hidden">
            <input class="input" type="text" id="ollama-custom" placeholder="e.g. mistral:7b">
          </div>
        </div>

        <!-- FREE with key section -->
        <div class="page-section-title mt-4">
          Free with Your Key
        </div>

        <!-- Gemini Flash -->
        <div class="glass-panel p-5 mb-3">
          <div class="flex-between mb-1">
            <div class="flex gap-3 items-center">
              <span class="provider-icon">✦</span>
              <div>
                <div class="font-semibold">Google Gemini Flash</div>
                <div class="text-xs text-muted">Free key · Vision support · 60 req/min</div>
              </div>
            </div>
            <div class="flex gap-2 items-center">
              <span data-status="gemini" class="status-dot status-gray"></span>
              <span class="badge badge-success">Free key</span>
            </div>
          </div>
          <div class="form-group mt-3">
            <label class="form-label" for="gemini-key">Google AI Studio Key</label>
            <div class="flex gap-2">
              <input class="input flex-1" type="password" id="gemini-key"
                placeholder="AIza…" autocomplete="off"
                value="${settings.geminiApiKey || ''}">
              <button class="btn btn-glass btn-sm" id="test-gemini" style="flex-shrink:0">Test</button>
            </div>
            <p class="form-hint">
              Get a free key (no credit card) at
              <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--color-accent)">aistudio.google.com</a>
            </p>
          </div>
        </div>

        <!-- PREMIUM section -->
        <div class="page-section-title mt-4">
          Premium Models (Claude, GPT-4o)
        </div>

        <!-- OpenRouter -->
        <div class="glass-panel p-5 mb-4">
          <div class="flex-between mb-1">
            <div class="flex gap-3 items-center">
              <span class="provider-icon">🌐</span>
              <div>
                <div class="font-semibold">OpenRouter</div>
                <div class="text-xs text-muted">Access to 200+ models · Claude, GPT-4o, Gemini</div>
              </div>
            </div>
            <div class="flex gap-2 items-center">
              <span data-status="openrouter" class="status-dot status-gray"></span>
            </div>
          </div>
          <div class="form-group mt-3">
            <label class="form-label" for="or-key">OpenRouter API Key</label>
            <div class="flex gap-2">
              <input class="input flex-1" type="password" id="or-key"
                placeholder="sk-or-v1-…" autocomplete="off"
                value="${settings.openrouterApiKey || ''}">
              <button class="btn btn-glass btn-sm" id="test-openrouter" style="flex-shrink:0">Test</button>
            </div>
            <p class="form-hint">
              Get a key at <a href="https://openrouter.ai" target="_blank" style="color:var(--color-accent)">openrouter.ai</a>
            </p>
          </div>
          <div class="form-group mt-3">
            <label class="form-label">Preferred Model</label>
            <div class="select-wrapper">
              <select class="input input-select" id="ai-model">
                ${OPENROUTER_MODELS.map(m => `
                  <option value="${m.value}" ${settings.openrouterModel === m.value ? 'selected' : ''}>${m.label}</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Mode selector -->
        <div class="glass-panel p-5 mb-4">
          <h3 class="mb-3">AI Mode</h3>
          <div class="select-wrapper">
            <select class="input input-select" id="ai-mode">
              <option value="auto" ${settings.aiMode !== 'deterministic' && settings.aiMode !== 'ai-only' ? 'selected' : ''}>
                Auto — Best available provider
              </option>
              <option value="deterministic" ${settings.aiMode === 'deterministic' ? 'selected' : ''}>
                Offline only — Rule-based analysis
              </option>
              <option value="ai-only" ${settings.aiMode === 'ai-only' ? 'selected' : ''}>
                AI only — Fail if no AI available
              </option>
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-full mb-6" id="save-ai-btn">
          Save AI Settings
        </button>

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

        <!-- Default Printer -->
        <div class="glass-panel p-5 mb-4">
          <h3 class="mb-4">Default Printer</h3>
          <div class="select-wrapper">
            <select class="input input-select" id="default-printer">
              <option value="bambu-x1c" ${(settings.defaultPrinter || 'bambu-x1c') === 'bambu-x1c' ? 'selected' : ''}>Bambu X1C</option>
              <option value="prusa-mk4"  ${(settings.defaultPrinter || 'bambu-x1c') === 'prusa-mk4'  ? 'selected' : ''}>Prusa MK4</option>
              <option value="ender-3"    ${(settings.defaultPrinter || 'bambu-x1c') === 'ender-3'    ? 'selected' : ''}>Ender 3</option>
              <option value="voron-24"   ${(settings.defaultPrinter || 'bambu-x1c') === 'voron-24'   ? 'selected' : ''}>Voron 2.4</option>
              <option value="other"      ${(settings.defaultPrinter || 'bambu-x1c') === 'other'      ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <!-- Display prefs -->
        <div class="glass-panel p-5 mb-4">
          <h3 class="mb-4">Display</h3>
          <div class="form-group mb-3">
            <div class="flex-between" style="min-height:44px">
              <label class="form-label">Show AI Assumptions Panel</label>
              <input type="checkbox" id="show-assumptions" ${settings.showAssumptions !== false ? 'checked' : ''}
                style="width:22px;height:22px;accent-color:var(--color-accent);cursor:pointer">
            </div>
          </div>
          <div class="form-group">
            <div class="flex-between" style="min-height:44px">
              <label class="form-label">Show "Why this design?" Panel</label>
              <input type="checkbox" id="show-why" ${settings.showWhyPanel !== false ? 'checked' : ''}
                style="width:22px;height:22px;accent-color:var(--color-accent);cursor:pointer">
            </div>
          </div>
        </div>

        <!-- About -->
        <div class="glass-panel p-5 mb-6">
          <h3 class="mb-3">About</h3>
          <div class="info-row"><span class="info-row-label">Version</span><span class="info-row-value">v3.0.0</span></div>
          <div class="info-row"><span class="info-row-label">Storage</span><span class="info-row-value">IndexedDB (local only)</span></div>
          <div class="info-row"><span class="info-row-label">Free AI</span><span class="info-row-value">Groq · Gemini · Ollama</span></div>
          <div class="info-row"><span class="info-row-label">3D Preview</span><span class="info-row-value">Three.js r160</span></div>
          <p class="text-xs text-dim mt-3">All data stays on your device. Nothing is shared unless AI analysis is enabled.</p>
        </div>
      </div>

      <style>
        .provider-icon { font-size: 1.5rem; width: 40px; text-align: center; flex-shrink: 0; }
        .status-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
          transition: background 0.3s ease;
        }
        .status-green  { background: var(--color-success); box-shadow: 0 0 6px rgba(52,211,153,0.5); }
        .status-yellow { background: var(--color-warning); box-shadow: 0 0 6px rgba(251,191,36,0.5); }
        .status-gray   { background: var(--glass-border-strong); }
      </style>
    `;

    this._bindEvents(container, settings);

    // Check Ollama status immediately
    import('../ai/ollama.provider.js').then(({ default: ollama }) => {
      ollama._checkAvailable().then(ok => {
        const badge = container.querySelector('#ollama-status-badge');
        if (badge) badge.textContent = ok ? 'Connected' : 'Not running';
        if (badge) badge.className = `badge ${ok ? 'badge-success' : 'badge-muted'}`;
      });
    });
  },

  _bindEvents(container, settings) {
    // Ollama custom model toggle
    container.querySelector('#ollama-model').addEventListener('change', (e) => {
      const customGroup = container.querySelector('#ollama-custom-model');
      if (e.target.value === 'custom') customGroup.classList.remove('hidden');
      else customGroup.classList.add('hidden');
    });

    // Test buttons
    container.querySelector('#test-groq').addEventListener('click', () => this._testProvider(container, 'groq'));
    container.querySelector('#test-openrouter').addEventListener('click', () => this._testProvider(container, 'openrouter'));
    container.querySelector('#test-gemini').addEventListener('click', () => this._testProvider(container, 'gemini'));

    // Save all AI settings
    container.querySelector('#save-ai-btn').addEventListener('click', async () => {
      haptic('medium');
      const groqKey = container.querySelector('#groq-key').value.trim();
      const geminiKey = container.querySelector('#gemini-key').value.trim();
      const orKey = container.querySelector('#or-key').value.trim();
      const orModel = container.querySelector('#ai-model').value;
      const aiMode = container.querySelector('#ai-mode').value;

      let ollamaModel = container.querySelector('#ollama-model').value;
      if (ollamaModel === 'custom') {
        ollamaModel = container.querySelector('#ollama-custom').value.trim() || 'llama3.2';
      }

      // Validate key formats
      if (groqKey && !groqKey.startsWith('gsk_')) {
        toast.warning('Groq keys start with gsk_ — check your key');
        return;
      }
      if (geminiKey && !geminiKey.startsWith('AIza')) {
        toast.warning('Gemini keys start with AIza — check your key');
        return;
      }
      if (orKey && !orKey.startsWith('sk-or-')) {
        toast.warning('OpenRouter keys start with sk-or- — check your key');
        return;
      }

      await settingsStore.setMany({
        groqApiKey: groqKey,
        geminiApiKey: geminiKey,
        openrouterApiKey: orKey,
        openrouterModel: orModel,
        aiMode,
        ollamaModel
      });

      // Cache key presence for synchronous checks
      if (orKey) sessionStorage.setItem('or_key_cached', '1');
      else sessionStorage.removeItem('or_key_cached');

      toast.success('Settings saved');
      haptic('success');
    });

    // Units
    container.querySelectorAll('[name="units-pref"]').forEach(radio => {
      radio.addEventListener('change', () => {
        settingsStore.set('units', radio.value);
        haptic('light');
      });
    });

    // Default printer
    container.querySelector('#default-printer')?.addEventListener('change', (e) => {
      settingsStore.set('defaultPrinter', e.target.value);
      haptic('light');
    });

    // Display prefs
    container.querySelector('#show-assumptions').addEventListener('change', (e) => {
      settingsStore.set('showAssumptions', e.target.checked);
    });
    container.querySelector('#show-why').addEventListener('change', (e) => {
      settingsStore.set('showWhyPanel', e.target.checked);
    });
  },

  async _testProvider(container, providerId) {
    const btn = container.querySelector(`#test-${providerId}`);
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = '…';
    btn.disabled = true;
    haptic('light');

    try {
      // Temporarily save the key so the provider can read it
      const keyInputId = { groq: 'groq-key', openrouter: 'or-key', gemini: 'gemini-key' }[providerId];
      const key = container.querySelector(`#${keyInputId}`)?.value.trim();
      const keySettingName = { groq: 'groqApiKey', openrouter: 'openrouterApiKey', gemini: 'geminiApiKey' }[providerId];
      if (key) await settingsStore.set(keySettingName, key);

      const module = await import(`./${providerId}.provider.js`);
      const provider = module.default;

      const start = Date.now();
      await provider.analyze(
        { description: 'test connection', measurements: {}, photos: [] },
        []
      );
      const ms = Date.now() - start;
      btn.textContent = `✓ ${ms}ms`;
      btn.style.color = 'var(--color-success)';
      haptic('success');
      setTimeout(() => { btn.textContent = orig; btn.style.color = ''; btn.disabled = false; }, 3000);
    } catch (e) {
      btn.textContent = '✗ Failed';
      btn.style.color = 'var(--color-error)';
      toast.error(e.message.slice(0, 80));
      haptic('error');
      setTimeout(() => { btn.textContent = orig; btn.style.color = ''; btn.disabled = false; }, 3000);
    }
  },

  unmount() {}
};

export default settingsView;
