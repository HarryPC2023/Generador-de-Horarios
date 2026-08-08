// ============================================================
// sw.js — Service Worker
// App retirada: esta versión solo sirve la pantalla de
// redirección a SIGA. Ya no cachea el motor del generador.
// ============================================================
const CACHE_NAME = 'horariogen-v47-retirado';

// Solo se cachean las páginas de bloqueo y el manifest.
const ARCHIVOS_CACHE = [
  'index.html',
  'generador.html',
  'manifest.json'
];

// ── INSTALL: guarda los archivos de la pantalla de bloqueo ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpia TODAS las cachés viejas (incluye las del
// generador completo que ya no existen) y toma control inmediato ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: red primero, caché de la pantalla de bloqueo como respaldo ──
self.addEventListener('fetch', event => {
  const url = event.request.url;

  if (event.request.method !== 'GET') return;
  if (!url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});