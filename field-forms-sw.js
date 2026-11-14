const prefix = 'enginecore-field-forms-';
const cacheName = `${prefix}v3`;
const shell = new URL('./field-forms.html', self.location).href;
const assets = [
  shell,
  './site.css',
  './portal.css',
  './field-forms.css',
  './field-forms.js',
  './field-forms-data.js',
].map((asset) => new URL(asset, self.location).href);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(assets.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(prefix) && key !== cacheName).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate') url.search = '';
  if (!assets.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    let response;
    try {
      response = await fetch(event.request);
    } catch {
      return await cache.match(url.href) ?? Response.error();
    }
    if (response.ok) await cache.put(url.href, response.clone()).catch(() => {});
    return response;
  })());
});
