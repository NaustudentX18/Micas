/**
 * Toast notification system.
 * Usage: toast.show('Message', 'success' | 'error' | 'warning' | 'info')
 */

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

let container = null;

function getContainer() {
  if (!container) container = document.getElementById('toast-container');
  return container;
}

const toast = {
  show(message, type = 'info', duration = 3500) {
    const c = getContainer();
    if (!c) return;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${ICONS[type] || ''}</span><span>${message}</span>`;
    c.appendChild(el);

    const remove = () => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };

    setTimeout(remove, duration);
    el.addEventListener('click', remove);
  },

  success: (msg, dur) => toast.show(msg, 'success', dur),
  error:   (msg, dur) => toast.show(msg, 'error', dur || 5000),
  warning: (msg, dur) => toast.show(msg, 'warning', dur),
  info:    (msg, dur) => toast.show(msg, 'info', dur),
};

export default toast;
