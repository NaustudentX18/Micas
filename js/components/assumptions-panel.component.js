/**
 * Collapsible assumptions panel.
 * Shows AI assumptions and missing info list.
 */

const assumptionsPanel = {
  html({ assumptions = [], missingInfo = [], open = false } = {}) {
    if (!assumptions.length && !missingInfo.length) return '';

    return `
      <div class="glass-panel p-4 mt-4 assumptions-panel-wrap">
        <button class="collapsible-header ${open ? 'open' : ''}" aria-expanded="${open}">
          <div class="flex gap-2 items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span class="font-semibold text-sm">
              AI Assumptions
              <span class="badge badge-muted ml-2">${assumptions.length}</span>
            </span>
          </div>
          <svg class="collapsible-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="collapsible-content ${open ? 'open' : ''}">
          <div class="mt-3">
            ${assumptions.map(a => `
              <div class="assumption-item">
                <span class="assumption-bullet">→</span>
                <span>${a}</span>
              </div>
            `).join('')}
            ${missingInfo.length > 0 ? `
              <div class="divider"></div>
              <div class="flex gap-2 items-center mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span class="text-xs text-muted font-semibold uppercase" style="letter-spacing:0.06em">Would Improve Confidence</span>
              </div>
              ${missingInfo.map(m => `
                <div class="assumption-item">
                  <span class="assumption-bullet" style="color:var(--color-warning)">?</span>
                  <span class="text-sm">${m}</span>
                </div>
              `).join('')}
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  bind(container) {
    container.querySelectorAll('.collapsible-header').forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const isOpen = header.classList.contains('open');
        header.classList.toggle('open', !isOpen);
        header.setAttribute('aria-expanded', !isOpen);
        content.classList.toggle('open', !isOpen);
      });
    });
  },

  render(container, data) {
    container.innerHTML = this.html(data);
    this.bind(container);
  }
};

export default assumptionsPanel;
