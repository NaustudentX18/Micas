import db from './db.js';
import bus from '../bus.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const projectsStore = {
  async getAll() {
    const all = await db.getAll('projects');
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async get(id) {
    return db.get('projects', id);
  },

  async create(data = {}) {
    const now = Date.now();
    const project = {
      id: uid(),
      name: data.name || 'New Project',
      description: data.description || '',
      thumbnail: data.thumbnail || null,
      createdAt: now,
      updatedAt: now,
      status: 'intake', // intake | questions | brief | generating | preview | done
      partCount: 0,
      tags: data.tags || [],
    };
    await db.put('projects', project);
    bus.emit('project:saved', project);
    return project;
  },

  async update(id, updates) {
    const existing = await db.get('projects', id);
    if (!existing) throw new Error(`Project ${id} not found`);
    const updated = { ...existing, ...updates, id, updatedAt: Date.now() };
    await db.put('projects', updated);
    bus.emit('project:saved', updated);
    return updated;
  },

  async delete(id) {
    await db.delete('projects', id);
    // Also delete related parts
    const parts = await db.getAllByIndex('parts', 'projectId', id);
    for (const p of parts) await db.delete('parts', p.id);
    bus.emit('project:deleted', { id });
  }
};

export default projectsStore;
