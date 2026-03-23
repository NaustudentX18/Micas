import { readFileAsDataURL, resizeImage } from '../utils/file.utils.js';
import toast from './toast.component.js';

/**
 * Photo capture component.
 * Supports camera capture (mobile) + file picker + drag-and-drop.
 * Manages array of photo objects: { id, dataUrl, name }
 */

const MAX_PHOTOS = 8;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const photoCapture = {
  create(initialPhotos = [], onChange) {
    let photos = [...initialPhotos];

    function render(container) {
      container.innerHTML = `
        <div class="photo-grid" id="photo-grid-${container.id || 'pc'}">
          ${photos.map(p => `
            <div class="photo-thumb" data-photo-id="${p.id}">
              <img src="${p.dataUrl}" alt="${p.name}" loading="lazy">
              <button class="photo-thumb-remove" data-remove="${p.id}" aria-label="Remove photo">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          `).join('')}
          ${photos.length < MAX_PHOTOS ? `
            <div class="photo-add-btn" id="photo-add-trigger" role="button" tabindex="0" aria-label="Add photo or screenshot">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/></svg>
              <span>${photos.length === 0 ? 'Add photos or screenshots' : 'Add more'}</span>
            </div>
            <input type="file" id="photo-file-input" accept="image/*,.heic,.heif" multiple style="display:none" aria-hidden="true">
          ` : ''}
        </div>
      `;
      bindEvents(container);
    }

    function bindEvents(container) {
      container.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.remove;
          photos = photos.filter(p => p.id !== id);
          render(container);
          onChange(photos);
        });
      });

      const trigger = container.querySelector('#photo-add-trigger');
      const input = container.querySelector('#photo-file-input');

      trigger?.addEventListener('click', () => input?.click());
      trigger?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') input?.click(); });

      input?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        const remaining = MAX_PHOTOS - photos.length;
        const toProcess = files.slice(0, remaining);

        for (const file of toProcess) {
          try {
            let dataUrl = await readFileAsDataURL(file);
            dataUrl = await resizeImage(dataUrl, 1280);
            photos.push({ id: uid(), dataUrl, name: file.name });
          } catch (err) {
            toast.error('Failed to load image.');
          }
        }
        if (files.length > remaining) {
          toast.warning(`Maximum ${MAX_PHOTOS} photos allowed.`);
        }
        render(container);
        onChange(photos);
        input.value = '';
      });

      // Drag-and-drop support
      const grid = container.querySelector('[id^="photo-grid-"]');
      if (grid) {
        grid.addEventListener('dragover', (e) => {
          e.preventDefault();
          grid.style.opacity = '0.7';
        });
        grid.addEventListener('dragleave', () => {
          grid.style.opacity = '';
        });
        grid.addEventListener('drop', async (e) => {
          e.preventDefault();
          grid.style.opacity = '';
          const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
          const remaining = MAX_PHOTOS - photos.length;
          const toProcess = files.slice(0, remaining);
          for (const file of toProcess) {
            try {
              let dataUrl = await readFileAsDataURL(file);
              dataUrl = await resizeImage(dataUrl, 1280);
              photos.push({ id: uid(), dataUrl, name: file.name });
            } catch { /* skip */ }
          }
          render(container);
          onChange(photos);
        });
      }
    }

    // Paste support — capture Ctrl+V / long-press paste anywhere on the page
    async function handlePaste(e) {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter(it => it.kind === 'file' && it.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();
      const remaining = MAX_PHOTOS - photos.length;
      const toProcess = imageItems.slice(0, remaining);
      for (const item of toProcess) {
        const file = item.getAsFile();
        if (!file) continue;
        try {
          let dataUrl = await readFileAsDataURL(file);
          dataUrl = await resizeImage(dataUrl, 1280);
          photos.push({ id: uid(), dataUrl, name: 'pasted-image.png' });
        } catch { /* skip */ }
      }
      if (imageItems.length > remaining) {
        toast.warning(`Maximum ${MAX_PHOTOS} photos allowed.`);
      }
      // Re-render the last-mounted container
      if (_mountedContainer) { render(_mountedContainer); onChange(photos); }
    }

    let _mountedContainer = null;

    return {
      mount(container) {
        _mountedContainer = container;
        render(container);
        document.addEventListener('paste', handlePaste);
      },
      getPhotos() { return [...photos]; },
      setPhotos(p) { photos = [...p]; },
      destroy() { document.removeEventListener('paste', handlePaste); _mountedContainer = null; }
    };
  }
};

export default photoCapture;
