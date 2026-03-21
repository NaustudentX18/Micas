import router from './router.js';
import bus from './bus.js';

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[SW]', e));
}

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

// Global error handler
window.addEventListener('unhandledrejection', e => {
  console.error('[app] Unhandled rejection:', e.reason);
});
