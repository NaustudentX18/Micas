/**
 * Mobile utility helpers for iOS/Android
 */

/** Haptic feedback — no-op on unsupported browsers */
export function haptic(style = 'light') {
  // Web Vibration API (Android Chrome, Firefox)
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 40, success: [10, 50, 10], error: [30, 60, 30] };
    navigator.vibrate(patterns[style] ?? patterns.light);
  }
}

/**
 * After a keyboard opens on iOS, the focused input can be hidden behind it.
 * This scrolls the element into view with a small offset after the keyboard animates.
 */
export function scrollInputIntoView(el, delay = 350) {
  if (!el) return;
  setTimeout(() => {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, delay);
}

/** Attach focus → scroll-into-view on all inputs/textareas inside a container */
export function attachKeyboardScrolling(container) {
  container.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('focus', () => scrollInputIntoView(el));
  });
}

/** Whether we are likely on a touch device */
export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
