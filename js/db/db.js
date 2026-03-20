/**
 * IndexedDB wrapper.
 * Stores: projects, parts, settings, exports
 */

const DB_NAME = 'micas-db';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('projects')) {
        const ps = db.createObjectStore('projects', { keyPath: 'id' });
        ps.createIndex('updatedAt', 'updatedAt');
      }

      if (!db.objectStoreNames.contains('parts')) {
        const parts = db.createObjectStore('parts', { keyPath: 'id' });
        parts.createIndex('projectId', 'projectId');
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('exports')) {
        const exp = db.createObjectStore('exports', { keyPath: 'id' });
        exp.createIndex('projectId', 'projectId');
      }

      if (!db.objectStoreNames.contains('photos')) {
        const ph = db.createObjectStore('photos', { keyPath: 'id' });
        ph.createIndex('partId', 'partId');
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    const req = fn(objectStore);
    transaction.oncomplete = () => resolve(req?.result);
    transaction.onerror = () => reject(transaction.error);
    if (req && req.onsuccess === undefined) {
      // fn returned a request
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }
  }));
}

const db = {
  get(store, key) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    }));
  },

  put(store, record) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readwrite').objectStore(store).put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },

  delete(store, key) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readwrite').objectStore(store).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  },

  getAll(store) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },

  getAllByIndex(store, indexName, value) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const idx = db.transaction(store, 'readonly').objectStore(store).index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  },

  clear(store) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readwrite').objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
  }
};

export default db;
