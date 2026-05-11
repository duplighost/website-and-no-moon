const CACHE_NAME = 'no-moon-hazard-ui-ending-clarity-v67';
const ASSETS = [
  './',
  './index.html',
  '../assets/no-moon/characters/rook-portrait.webp',
  '../assets/no-moon/characters/nyx-portrait.webp',
  '../assets/no-moon/characters/sol-portrait.webp',
  '../assets/no-moon/characters/mire-portrait.webp',
  '../assets/no-moon/title/no-moon-title-desktop.webp',
  '../assets/no-moon/title/no-moon-title-mobile.webp',
  '../assets/no-moon/title/no-moon-title-poster.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(ASSETS.map((asset) => cache.add(asset)));
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      try { console.warn('[no-moon-sw] install cache misses', failed.length); } catch (_) {}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith('no-moon-'))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  const isGameDocument = request.mode === 'navigate' || url.pathname.endsWith('/no-moon/') || url.pathname.endsWith('/no-moon/index.html');
  const isCharacterArt = url.pathname.includes('/assets/no-moon/characters/') && url.pathname.endsWith('.webp');
  const isTitleArt = url.pathname.includes('/assets/no-moon/title/') && url.pathname.endsWith('.webp');
  if (!isGameDocument && !isCharacterArt && !isTitleArt) return;

  if (isCharacterArt || isTitleArt) {
    event.respondWith(
      caches.match(request)
        .then((cached) => cached || fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }))
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/no-moon/index.html') || caches.match('./index.html')))
  );
});
