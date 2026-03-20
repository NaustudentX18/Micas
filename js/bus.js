/**
 * Tiny event bus — publish/subscribe for cross-module communication.
 * Use for decoupled events only; prefer direct imports within the same layer.
 *
 * Events used in the system:
 *   state:changed          — state store mutation
 *   generator:mesh-ready   — a generator has produced a mesh
 *   ai:analysis-complete   — AI analysis finished
 *   ai:analysis-start      — AI analysis started
 *   project:saved          — a project was saved to IndexedDB
 *   validation:complete    — validation report ready
 */

const handlers = new Map();

const bus = {
  on(event, handler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(handler);
    return () => this.off(event, handler); // returns unsubscribe fn
  },

  off(event, handler) {
    handlers.get(event)?.delete(handler);
  },

  emit(event, payload) {
    handlers.get(event)?.forEach(h => {
      try { h(payload); }
      catch (err) { console.error(`[bus] Error in handler for '${event}':`, err); }
    });
  },

  once(event, handler) {
    const wrapped = (payload) => {
      handler(payload);
      this.off(event, wrapped);
    };
    this.on(event, wrapped);
  }
};

export default bus;
