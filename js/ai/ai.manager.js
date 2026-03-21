import bus from '../bus.js';
import settingsStore from '../db/settings.store.js';
import ruleBasedProvider from './rule-based.provider.js';
import openrouterProvider from './openrouter.provider.js';
import groqProvider from './groq.provider.js';
import geminiProvider from './gemini.provider.js';
import ollamaProvider from './ollama.provider.js';

/**
 * AI provider manager.
 * Priority chain (auto mode):
 *   1. Ollama (local — 100% free, zero latency, privacy)
 *   2. Groq (free tier — Llama 3.1 70B via app proxy, zero config)
 *   3. OpenRouter (user's own key — best models, premium)
 *   4. Gemini Flash (user's free Google key — multimodal)
 *   5. Rule-based (offline fallback — always available, capped at 75%)
 */

const registry = new Map();

registry.set(ruleBasedProvider.id, ruleBasedProvider);
registry.set(openrouterProvider.id, openrouterProvider);
registry.set(groqProvider.id, groqProvider);
registry.set(geminiProvider.id, geminiProvider);
registry.set(ollamaProvider.id, ollamaProvider);

const aiManager = {
  register(provider) {
    registry.set(provider.id, provider);
  },

  getProvider(id) {
    return registry.get(id) || null;
  },

  listProviders() {
    return [...registry.values()];
  },

  async analyze(intake, answers = []) {
    const aiMode = await settingsStore.get('aiMode');
    const openrouterKey = await settingsStore.get('openrouterApiKey');
    const geminiKey = await settingsStore.get('geminiApiKey');
    const groqKey = await settingsStore.get('groqApiKey');

    let priority;

    if (aiMode === 'deterministic') {
      priority = ['rule-based'];
    } else if (aiMode === 'ai-only') {
      priority = this._buildNetworkChain(openrouterKey, geminiKey, groqKey);
    } else {
      // auto: smart priority — local first, then free cloud, then premium, then offline
      if (!navigator.onLine) {
        priority = ['ollama', 'rule-based'];
      } else {
        priority = this._buildNetworkChain(openrouterKey, geminiKey, groqKey);
      }
    }

    bus.emit('ai:analysis-start', { priority });

    let lastError = null;
    let lastProviderAttempted = null;

    for (const id of priority) {
      const provider = registry.get(id);
      if (!provider) continue;

      if (!provider.isAvailable()) {
        console.info(`[AI] Provider ${id} not available, skipping`);
        continue;
      }

      lastProviderAttempted = id;
      try {
        console.info(`[AI] Trying provider: ${id}`);
        const result = await provider.analyze(intake, answers);
        bus.emit('ai:analysis-complete', { result, provider: id });
        return { ...result, _provider: id };
      } catch (err) {
        console.warn(`[AI] Provider ${id} failed:`, err.message);
        bus.emit('ai:provider-failed', { provider: id, error: err.message });
        lastError = err;
        // If it's a config error (no key), stop trying this provider
        if (err.message.includes('not set') || err.message.includes('not configured')) continue;
      }
    }

    // Should never reach here since rule-based always works
    throw lastError || new Error('All AI providers failed');
  },

  /**
   * Build the ordered provider list for network mode.
   * Ollama always first (local), then providers that have keys / built-in proxy.
   */
  _buildNetworkChain(openrouterKey, geminiKey, groqKey) {
    const chain = [];

    // 1. Ollama — local first, always free
    chain.push('ollama');

    // 2. Groq — built-in proxy (zero config) or personal key
    chain.push('groq');

    // 3. OpenRouter — if user has a key
    if (openrouterKey) chain.push('openrouter');

    // 4. Gemini Flash — if user has a free key
    if (geminiKey) chain.push('gemini');

    // 5. Rule-based — always last
    chain.push('rule-based');

    return chain;
  },

  /** Returns status of all providers for the settings UI */
  async getProviderStatuses() {
    const [orKey, geminiKey, groqKey, ollamaKey] = await Promise.all([
      settingsStore.get('openrouterApiKey'),
      settingsStore.get('geminiApiKey'),
      settingsStore.get('groqApiKey'),
      settingsStore.get('ollamaModel')
    ]);

    const ollamaAvail = await ollamaProvider._checkAvailable();

    return {
      ollama:      { available: ollamaAvail, hasKey: ollamaAvail, free: true },
      groq:        { available: navigator.onLine, hasKey: !!groqKey, free: true },
      openrouter:  { available: navigator.onLine && !!orKey, hasKey: !!orKey, free: false },
      gemini:      { available: navigator.onLine && !!geminiKey, hasKey: !!geminiKey, free: true },
      'rule-based':{ available: true, hasKey: true, free: true }
    };
  }
};

export default aiManager;
