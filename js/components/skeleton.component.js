/**
 * Skeleton loader factory.
 * Returns HTML strings for common skeleton patterns.
 */

const skeleton = {
  card(count = 1) {
    return Array.from({ length: count }, () => `
      <div class="card mb-3">
        <div class="flex gap-3 items-center mb-4">
          <div class="skeleton skeleton-avatar"></div>
          <div class="flex-1">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-text"></div>
          </div>
        </div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text"></div>
      </div>
    `).join('');
  },

  text(lines = 3) {
    return Array.from({ length: lines }, (_, i) =>
      `<div class="skeleton skeleton-text" style="width:${i === lines-1 ? 65 : 100}%"></div>`
    ).join('');
  },

  title() {
    return `<div class="skeleton skeleton-title"></div>`;
  },

  viewer() {
    return `
      <div class="viewer-skeleton">
        <div class="flex-col items-center gap-4 text-center">
          <div class="spinner spinner-lg" style="border-top-color:var(--color-accent)"></div>
          <p class="text-muted text-sm">Rendering 3D model…</p>
        </div>
      </div>
    `;
  },

  fullPage() {
    return `
      <div class="page page-enter">
        <div class="page-header">
          <div class="skeleton skeleton-title" style="width:50%"></div>
          <div class="skeleton skeleton-text" style="width:70%"></div>
        </div>
        ${skeleton.card(3)}
      </div>
    `;
  }
};

export default skeleton;
