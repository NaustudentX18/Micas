import router from '../router.js';
import bus from '../bus.js';

const NAV_ITEMS = [
  {
    id: 'dashboard', label: 'Projects', path: '/dashboard',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`
  },
  {
    id: 'settings', label: 'Settings', path: '/settings',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.66-6.34-1.42 1.42M7.76 16.24l-1.42 1.42m12.72 0-1.42-1.42M7.76 7.76 6.34 6.34"/></svg>`
  },
];

const nav = {
  mount(container) {
    container.classList.remove('hidden');

    const render = () => {
      const hash = window.location.hash.slice(2) || 'dashboard';
      const active = hash.split('/')[0] || 'dashboard';

      container.innerHTML = `
        <nav class="nav-bar" role="navigation" aria-label="Main navigation">
          <div class="nav-header hidden">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="url(#nlogoGrad)"/>
              <path d="M12 36 L24 12 L36 36" stroke="white" stroke-width="2.5" stroke-linejoin="round" fill="none"/>
              <path d="M16 28 L32 28" stroke="white" stroke-width="2" stroke-linecap="round"/>
              <defs>
                <linearGradient id="nlogoGrad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stop-color="#6c8aff"/>
                  <stop offset="100%" stop-color="#a46cff"/>
                </linearGradient>
              </defs>
            </svg>
            My CAD
          </div>
          ${NAV_ITEMS.map(item => `
            <button
              class="nav-item ${active === item.id ? 'active' : ''}"
              data-path="${item.path}"
              aria-label="${item.label}"
              aria-current="${active === item.id ? 'page' : 'false'}"
            >
              ${item.icon}
              <span>${item.label}</span>
            </button>
          `).join('')}
        </nav>
      `;

      container.querySelectorAll('[data-path]').forEach(btn => {
        btn.addEventListener('click', () => router.navigate(btn.dataset.path));
      });
    };

    render();
    window.addEventListener('hashchange', render);
  }
};

export default nav;
