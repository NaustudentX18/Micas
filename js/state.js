import bus from './bus.js';

/**
 * Global reactive session state store.
 * Holds the current pipeline state for one working session.
 * Persisted to IndexedDB on meaningful mutations via the stores.
 */

const _state = {
  currentProjectId: null,
  currentPartId: null,

  intake: {
    photos: [],        // Array of { dataUrl, name }
    description: '',
    measurements: {}   // { width, depth, height, ... }
  },

  answers: [],         // Array of { questionId, value }
  questionHistory: [], // All questions asked

  brief: null,         // AnalysisResult.cadBrief object

  confidence: 0,       // 0-100
  assumptions: [],     // string[]
  missingInfo: [],     // string[]
  reasoning: '',       // "Why this design?" text
  aiProvider: null,    // which provider answered ('openrouter' | 'rule-based')

  selectedPartType: null, // string
  generatorParams: {},    // current form values

  currentMesh: null,      // Mesh object from geometry system
  currentOpenSCAD: '',    // .scad source string
  currentMetadata: {},    // from generator.generate()

  validationReport: null,  // ValidationReport
  exportHistory: [],       // [ { format, filename, timestamp } ]

  aiMode: 'auto',        // 'auto' | 'ai-only' | 'deterministic'
};

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k] = o[k] ?? {}, obj);
  target[last] = value;
}

const state = {
  get(path) {
    if (!path) return { ..._state };
    return getPath(_state, path);
  },

  set(path, value) {
    setPath(_state, path, value);
    bus.emit('state:changed', { path, value });
  },

  reset() {
    Object.assign(_state, {
      currentPartId: null,
      intake: { photos: [], description: '', measurements: {} },
      answers: [],
      questionHistory: [],
      brief: null,
      confidence: 0,
      assumptions: [],
      missingInfo: [],
      reasoning: '',
      aiProvider: null,
      selectedPartType: null,
      generatorParams: {},
      currentMesh: null,
      currentOpenSCAD: '',
      currentMetadata: {},
      validationReport: null,
      exportHistory: [],
    });
    bus.emit('state:changed', { path: 'reset', value: null });
  },

  snapshot() {
    return JSON.parse(JSON.stringify({
      ..._state,
      currentMesh: null // don't persist mesh bytes in state snapshot
    }));
  }
};

export default state;
