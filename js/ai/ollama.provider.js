/**
 * Ollama Provider — 100% local AI inference, completely free and private
 * Auto-detects Ollama running at localhost:11434
 * Supports any model the user has pulled: llama3.2, mistral, deepseek-r1, phi3, etc.
 * No API key, no internet, no usage limits.
 */
import { buildAnalysisPrompt } from './prompt.builder.js';
import settingsStore from '../db/settings.store.js';

const OLLAMA_BASE = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2';
const DETECT_TIMEOUT = 1500; // ms — fast timeout for availability check

const ollamaProvider = {
  id: 'ollama',
  label: 'Ollama (Local — 100% Private)',
  requiresNetwork: false, // Works on local network

  _available: null,   // cached availability state
  _lastCheck: 0,

  async _checkAvailable() {
    // Re-check every 30s
    if (Date.now() - this._lastCheck < 30000 && this._available !== null) {
      return this._available;
    }
    this._lastCheck = Date.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), DETECT_TIMEOUT);
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: ctrl.signal });
      clearTimeout(timer);
      this._available = res.ok;
      return this._available;
    } catch {
      this._available = false;
      return false;
    }
  },

  isAvailable() {
    // Sync check — async _checkAvailable is called in analyze()
    // Return cached value; initial state assumes available if we're offline
    return this._available !== false;
  },

  async _getModel() {
    return await settingsStore.get('ollamaModel') || DEFAULT_MODEL;
  },

  async _listModels() {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map(m => m.name);
  },

  async callWithPrompt(promptText) {
    const ok = await this._checkAvailable();
    if (!ok) throw new Error('Ollama is not running at localhost:11434');
    const model = await this._getModel();
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a professional mechanical engineer and FDM 3D printing expert. Respond ONLY with a JSON object.' },
          { role: 'user', content: promptText }
        ],
        stream: false,
        format: 'json'
      })
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    const content = data.message?.content || data.response || '';
    if (!content) throw new Error('Empty Ollama response');
    return this._parseResult(content);
  },

  async analyze(intake, answers) {
    // Confirm actually available before trying
    const ok = await this._checkAvailable();
    if (!ok) throw new Error('Ollama is not running at localhost:11434 — install from ollama.com');

    const model = await this._getModel();
    const prompt = buildAnalysisPrompt(intake, answers);

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional mechanical engineer and FDM 3D printing expert. Analyze design requirements and respond ONLY with a JSON object — no markdown, no explanation. The JSON must include: object_type, recommended_generator, material, fit_tolerance, dimensions (with width/depth/height in mm), confidence (0-100), assumptions (array), missing_info (array), reasoning (string).'
          },
          { role: 'user', content: prompt }
        ],
        stream: false,
        format: 'json'
      })
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      if (res.status === 404) {
        throw new Error(`Model "${model}" not found in Ollama. Run: ollama pull ${model}`);
      }
      throw new Error(`Ollama error ${res.status}: ${msg}`);
    }

    const data = await res.json();
    const content = data.message?.content || data.response || '';
    if (!content) throw new Error('Empty response from Ollama');

    return this._parseResult(content);
  },

  _parseResult(raw) {
    let obj;
    try {
      obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      const match = raw.match(/\{[\s\S]+\}/);
      if (match) obj = JSON.parse(match[0]);
      else throw new Error('Could not parse Ollama JSON response');
    }

    const brief = obj.cad_brief || obj.cadBrief || obj;

    return {
      cadBrief: {
        object_type:           brief.object_type || brief.objectType || 'custom part',
        recommended_generator: brief.recommended_generator || brief.recommendedGenerator || 'box',
        material:              brief.material || 'PLA',
        fit_tolerance:         brief.fit_tolerance || brief.fitTolerance || 'standard',
        dimensions:            brief.dimensions || {},
        special_features:      brief.special_features || brief.specialFeatures || [],
        print_settings:        brief.print_settings || brief.printSettings || {},
        reasoning:             brief.reasoning || ''
      },
      confidence:   Math.min(Math.max(brief.confidence ?? obj.confidence ?? 80, 0), 100),
      assumptions:  brief.assumptions || obj.assumptions || [],
      missingInfo:  brief.missing_info || brief.missingInfo || obj.missing_info || [],
      reasoning:    brief.reasoning || obj.reasoning || ''
    };
  },

  /** For settings UI — lists available Ollama models */
  async getAvailableModels() {
    try { return await this._listModels(); } catch { return []; }
  }
};

export default ollamaProvider;
