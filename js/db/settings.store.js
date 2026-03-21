import db from './db.js';

const DEFAULTS = {
  aiProvider: 'auto',          // 'auto' | 'openrouter' | 'rule-based'
  openrouterApiKey: '',
  openrouterModel: 'anthropic/claude-3-haiku',
  units: 'mm',                 // 'mm' | 'in'
  theme: 'dark',
  aiMode: 'auto',              // 'auto' | 'ai-only' | 'deterministic'
  showAssumptions: true,
  showWhyPanel: true,
};

const settingsStore = {
  async get(key) {
    const record = await db.get('settings', key);
    return record?.value ?? DEFAULTS[key] ?? null;
  },

  async set(key, value) {
    await db.put('settings', { key, value });
  },

  async getAll() {
    const records = await db.getAll('settings');
    const result = { ...DEFAULTS };
    for (const r of records) result[r.key] = r.value;
    return result;
  },

  async setMany(obj) {
    for (const [key, value] of Object.entries(obj)) {
      await this.set(key, value);
    }
  }
};

export default settingsStore;
