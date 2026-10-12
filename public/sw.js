/*
 * CRAVE – Service Worker
 *
 * Zweck: die App startet auch ohne Netz. Daten laufen bewusst NICHT ueber den
 * Cache: /api wird immer direkt aus dem Netz geholt, damit nie ein alter
 * Datenstand angezeigt wird. Der lokale Zwischenspeicher der App uebernimmt
 * den Offline-Fall.
 */

const VERSION = 'crave-v2';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
/** So lange darf das Netz fuer eine Seite brauchen, bevor die gespeicherte kommt. */
const NAV_TIMEOUT_MS = 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/icons/icon-192.png', '/icons/apple-touch-icon.png']))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // immer frisch aus dem Netz

  // Seitenaufrufe: erst Netz – aber nicht beliebig lange. Steht die Seite
  // schon im Speicher und das Netz braucht laenger als einen Moment (Funkloch,
  // schwaches WLAN in der Kueche), kommt die gespeicherte. Die Antwort aus dem
  // Netz wird trotzdem abgewartet und fuer das naechste Oeffnen abgelegt.
  if (request.mode === 'navigate') {
    const network = fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
      }
      return response;
    });
    event.waitUntil(network.catch(() => undefined));
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (!cached) {
          try {
            return await network;
          } catch {
            const fallback = await caches.match('/');
            return fallback ?? Response.error();
          }
        }
        const frist = new Promise((resolve) => setTimeout(() => resolve(null), NAV_TIMEOUT_MS));
        const fresh = await Promise.race([network.catch(() => null), frist]);
        return fresh && fresh.ok ? fresh : cached;
      })(),
    );
    return;
  }

  // Statische Bausteine sind versioniert: Cache zuerst.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        });
      }),
    );
  }
});
