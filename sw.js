// ============================================================
// sw.js — Service Worker
// Permite instalación como PWA y funcionamiento offline
// ============================================================

const CACHE_NAME = 'horariogen-v7';

// Lista de archivos que se guardan en caché al instalar la app
// Equivale a los archivos estáticos que Flask servía
const ARCHIVOS_CACHE = [
  'index.html',
  'generador.html',
  'static/css/style.css',
  'static/js/parser.js',
  'static/js/scheduler.js',
  'static/js/generador.js',
  'static/img/512x512.png',
  'static/img/harry.png',
  'manifest.json'
];

// ── INSTALL: guarda todos los archivos en caché ──────────────
// Se ejecuta una sola vez cuando el usuario instala la app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpia cachés viejas ───────────────────────────
// Se ejecuta cuando se actualiza la app
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

// ── FETCH: sirve desde caché, si no va a la red ──────────────
// Para archivos locales usa caché primero.
// Para CDN externas (SheetJS, html2canvas) usa la red primero.
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Recursos externos (CDN) → red primero, caché como respaldo
  if (url.includes('cdnjs.cloudflare.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Recursos locales → caché primero, red como respaldo
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});