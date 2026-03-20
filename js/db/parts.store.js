import db from './db.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const partsStore = {
  async get(id) {
    return db.get('parts', id);
  },

  async getByProject(projectId) {
    return db.getAllByIndex('parts', 'projectId', projectId);
  },

  async create(projectId, data = {}) {
    const now = Date.now();
    const part = {
      id: uid(),
      projectId,
      name: data.name || 'Part',
      partType: data.partType || null,
      intake: data.intake || { photos: [], description: '', measurements: {} },
      answers: data.answers || [],
      brief: data.brief || null,
      confidence: data.confidence || 0,
      assumptions: data.assumptions || [],
      generatorParams: data.generatorParams || {},
      openscadSource: data.openscadSource || '',
      metadata: data.metadata || {},
      validationReport: data.validationReport || null,
      aiProvider: data.aiProvider || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.put('parts', part);
    return part;
  },

  async update(id, updates) {
    const existing = await db.get('parts', id);
    if (!existing) throw new Error(`Part ${id} not found`);
    const updated = { ...existing, ...updates, id, updatedAt: Date.now() };
    await db.put('parts', updated);
    return updated;
  },

  async delete(id) {
    await db.delete('parts', id);
  }
};

export default partsStore;
