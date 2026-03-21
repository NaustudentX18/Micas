/**
 * Hash-based SPA router.
 * Routes: #/dashboard, #/project/:id/intake, .../questions, .../brief,
 *         .../generator, .../preview, .../export, #/settings
 *
 * Views expose: mount(container, params) and optionally unmount()
 */

const routes = [];
let currentView = null;
let container = null;

const router = {
  register(pattern, viewModule) {
    // Convert '/project/:id/intake' to a regex that extracts named params
    const keys = [];
    const re = new RegExp(
      '^' + pattern.replace(/:([a-z]+)/gi, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$'
    );
    routes.push({ pattern, re, keys, viewModule });
  },

  navigate(path) {
    window.location.hash = '#' + path;
  },

  back() {
    window.history.back();
  },

  init(mainContainer) {
    container = mainContainer;
    window.addEventListener('hashchange', () => this._resolve());
    this._resolve();
  },

  _resolve() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    const path = hash.startsWith('/') ? hash : '/' + hash;

    for (const route of routes) {
      const m = path.match(route.re);
      if (!m) continue;

      const params = {};
      route.keys.forEach((k, i) => { params[k] = m[i + 1]; });

      if (currentView?.unmount) currentView.unmount();
      container.innerHTML = '';

      route.viewModule().then(module => {
        const view = module.default ?? module;
        currentView = view;
        view.mount(container, params);
      }).catch(err => {
        console.error('[router] Failed to load view:', err);
        container.innerHTML = `<div class="page"><p class="text-error">Failed to load page.</p></div>`;
      });
      return;
    }

    // 404 → dashboard
    this.navigate('/dashboard');
  }
};

export default router;
