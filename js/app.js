import router from './router.js';
import bus from './bus.js';
import settingsStore from './db/settings.store.js';

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[SW]', e));
}

// Warm up AI key availability flag from IndexedDB so openrouter.isAvailable()
// returns true after a page reload without requiring a visit to Settings first.
settingsStore.get('openrouterApiKey').then(key => {
  if (key) sessionStorage.setItem('or_key_cached', '1');
  else sessionStorage.removeItem('or_key_cached');
}).catch(() => {});

// Register all routes (lazy-loaded views)
router.register('/dashboard',                   () => import('./views/dashboard.view.js'));
router.register('/project/:id/intake',          () => import('./views/intake.view.js'));
router.register('/project/:id/questions',       () => import('./views/questions.view.js'));
router.register('/project/:id/brief',           () => import('./views/brief.view.js'));
router.register('/project/:id/generator',       () => import('./views/generator.view.js'));
router.register('/project/:id/preview',         () => import('./views/preview.view.js'));
router.register('/project/:id/export',          () => import('./views/export.view.js'));
router.register('/settings',                    () => import('./views/settings.view.js'));

// Mount nav
import('./components/nav.component.js').then(m => {
  const nav = document.getElementById('app-nav');
  m.default.mount(nav);
});

// Start router
const main = document.getElementById('app-main');
router.init(main);

// Hide loading screen once first view is painted
const loading = document.getElementById('app-loading');
bus.once('state:changed', () => {
  setTimeout(() => loading.classList.add('fade-out'), 300);
});
// Fallback — hide after 1.5s regardless
setTimeout(() => loading.classList.add('fade-out'), 1500);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Skip if modifier keys are held
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  // Skip if focus is in an editable element
  const target = e.target;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;

  const key = e.key;

  // n/N — new project (dashboard only)
  if (key === 'n' || key === 'N') {
    const btn = document.querySelector('#new-project-btn');
    if (btn) { btn.click(); return; }
  }

  // s/S — navigate to settings
  if (key === 's' || key === 'S') {
    router.navigate('/settings');
    return;
  }

  // h/H — navigate to dashboard (home)
  if (key === 'h' || key === 'H') {
    router.navigate('/dashboard');
    return;
  }

  // Escape — close modal overlay if present
  if (key === 'Escape') {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
    return;
  }
});

// Global error handler
window.addEventListener('unhandledrejection', e => {
  console.error('[app] Unhandled rejection:', e.reason);
});
