import bus from '../bus.js';
import settingsStore from '../db/settings.store.js';
import ruleBasedProvider from './rule-based.provider.js';
import openrouterProvider from './openrouter.provider.js';

/**
 * AI provider manager.
 * Maintains priority list, falls through on error.
 * Rule-based is always last and always available.
 */

const registry = new Map();

// Register built-in providers
registry.set(ruleBasedProvider.id, ruleBasedProvider);
registry.set(openrouterProvider.id, openrouterProvider);

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
    const preferredId = await settingsStore.get('aiProvider');
    const aiMode = await settingsStore.get('aiMode');

    // Determine provider priority
    let priority;
    if (aiMode === 'deterministic') {
      priority = ['rule-based'];
    } else if (aiMode === 'ai-only') {
      priority = ['openrouter', 'rule-based'];
    } else {
      // auto: try network providers first
      priority = navigator.onLine
        ? ['openrouter', 'rule-based']
        : ['rule-based'];
    }

    // If user has a specific preference, try it first
    if (preferredId && preferredId !== 'auto' && priority[0] !== preferredId) {
      priority = [preferredId, ...priority.filter(id => id !== preferredId)];
    }

    bus.emit('ai:analysis-start', { priority });

    let lastError = null;
    for (const id of priority) {
      const provider = registry.get(id);
      if (!provider) continue;

      if (!provider.isAvailable()) {
        console.info(`[AI] Provider ${id} not available, skipping`);
        continue;
      }

      try {
        const result = await provider.analyze(intake, answers);
        bus.emit('ai:analysis-complete', { result, provider: id });
        return result;
      } catch (err) {
        console.warn(`[AI] Provider ${id} failed:`, err.message);
        lastError = err;
      }
    }

    // Should never reach here since rule-based always works
    throw lastError || new Error('All AI providers failed');
  }
};

export default aiManager;
