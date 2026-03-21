const CACHE_NAME = 'micas-shell-v3';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/glass.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/router.js',
  '/js/bus.js',
  '/js/state.js',
  '/js/db/db.js',
  '/js/db/projects.store.js',
  '/js/db/parts.store.js',
  '/js/db/settings.store.js',
  '/js/views/_pipeline.js',
  '/js/views/dashboard.view.js',
  '/js/views/intake.view.js',
  '/js/views/questions.view.js',
  '/js/views/brief.view.js',
  '/js/views/generator.view.js',
  '/js/views/preview.view.js',
  '/js/views/export.view.js',
  '/js/views/settings.view.js',
  '/js/components/nav.component.js',
  '/js/components/card.component.js',
  '/js/components/confidence-meter.component.js',
  '/js/components/assumptions-panel.component.js',
  '/js/components/photo-capture.component.js',
  '/js/components/skeleton.component.js',
  '/js/components/toast.component.js',
  '/js/components/modal.component.js',
  '/js/components/validation-panel.component.js',
  '/js/utils/mobile.js',
  '/js/ai/ai.interface.js',
  '/js/ai/ai.manager.js',
  '/js/ai/openrouter.provider.js',
  '/js/ai/rule-based.provider.js',
  '/js/ai/prompt.builder.js',
  '/js/questions/question.bank.js',
  '/js/questions/question.engine.js',
  '/js/questions/question.scorer.js',
  '/js/generators/generator.registry.js',
  '/js/generators/base.generator.js',
  '/js/generators/box.generator.js',
  '/js/generators/bracket.generator.js',
  '/js/generators/spacer.generator.js',
  '/js/generators/organizer.generator.js',
  '/js/generators/phone-stand.generator.js',
  '/js/generators/enclosure.generator.js',
  '/js/generators/adapter.generator.js',
  '/js/generators/custom.generator.js',
  '/js/generators/gear.generator.js',
  '/js/generators/threaded-connector.generator.js',
  '/js/generators/hinge.generator.js',
  '/js/generators/snap-fit.generator.js',
  '/js/geometry/mesh.js',
  '/js/geometry/primitives.js',
  '/js/geometry/csg.js',
  '/js/geometry/transform.js',
  '/js/geometry/helix.js',
  '/js/geometry/involute.js',
  '/js/stl/stl-writer.js',
  '/js/stl/stl-reader.js',
  '/js/openscad/openscad-writer.js',
  '/js/export/export.manager.js',
  '/js/export/bambu-sheet.export.js',
  '/js/export/makerworld.export.js',
  '/js/export/job-summary.export.js',
  '/js/export/parametric-json.export.js',
  '/js/export/confidence-summary.export.js',
  '/js/validation/validation.engine.js',
  '/js/validation/thin-wall.check.js',
  '/js/validation/overhang.check.js',
  '/js/validation/orientation.advisor.js',
  '/js/preview/three-viewer.js',
  '/js/preview/touch-controls.js',
  '/js/utils/file.utils.js',
  '/js/utils/math.utils.js',
  '/js/utils/format.utils.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/vendor/three.module.js'
];

// AI API hostnames — never intercept these
const AI_HOSTS = ['openrouter.ai', 'api.openai.com', 'generativelanguage.googleapis.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never cache AI API calls
  if (AI_HOSTS.some(h => url.hostname.includes(h))) return;

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
