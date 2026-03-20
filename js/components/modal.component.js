/**
 * Accessible modal/sheet component.
 * Usage: modal.confirm({ title, body, confirmText, danger }) → Promise<boolean>
 *        modal.show({ title, content, actions }) → modalEl (raw)
 */

function createOverlay(content) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" role="dialog" aria-modal="true">
      <div class="modal-handle"></div>
      ${content}
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Trap focus
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.remove();
  });

  document.getElementById('modal-container').appendChild(overlay);
  // Focus first focusable element
  requestAnimationFrame(() => {
    const first = overlay.querySelector('button, input, [tabindex="0"]');
    first?.focus();
  });

  return overlay;
}

const modal = {
  confirm({ title = 'Confirm', body = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
      const overlay = createOverlay(`
        <h2 class="modal-title">${title}</h2>
        <p class="modal-body">${body}</p>
        <div class="modal-actions">
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-full" data-confirm>
            ${confirmText}
          </button>
          <button class="btn btn-glass btn-full" data-cancel>
            ${cancelText}
          </button>
        </div>
      `);

      overlay.querySelector('[data-confirm]').addEventListener('click', () => {
        overlay.remove(); resolve(true);
      });
      overlay.querySelector('[data-cancel]').addEventListener('click', () => {
        overlay.remove(); resolve(false);
      });
    });
  },

  alert({ title = 'Notice', body = '', buttonText = 'OK' } = {}) {
    return new Promise((resolve) => {
      const overlay = createOverlay(`
        <h2 class="modal-title">${title}</h2>
        <p class="modal-body">${body}</p>
        <div class="modal-actions">
          <button class="btn btn-glass btn-full" data-ok>${buttonText}</button>
        </div>
      `);
      overlay.querySelector('[data-ok]').addEventListener('click', () => {
        overlay.remove(); resolve();
      });
    });
  },

  custom(htmlContent) {
    return createOverlay(htmlContent);
  },

  close() {
    const el = document.querySelector('.modal-overlay');
    if (el) el.remove();
  }
};

export default modal;
