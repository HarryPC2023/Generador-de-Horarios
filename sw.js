// ============================================================
// sw.js — Service Worker
// Permite instalación como PWA y funcionamiento offline
// ============================================================
const CACHE_NAME = 'horariogen-v30';
 
// Lista de archivos que se guardan en caché al instalar la app
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
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ARCHIVOS_CACHE))
    // OJO: ya no se llama a self.skipWaiting() aquí.
    // La nueva versión se queda "esperando" hasta que la página
    // se lo pida (ver mensaje 'SKIP_WAITING' abajo), así el usuario
    // decide cuándo actualizar en vez de que pase de golpe.
  );
});

// ── ACTUALIZACIÓN BAJO DEMANDA ────────────────────────────────
// El front-end (index.html / generador.html) envía este mensaje
// cuando el usuario pulsa "Actualizar ahora" en el aviso de nueva versión.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
 
// ── ACTIVATE: limpia cachés viejas ───────────────────────────
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
 
// ── FETCH: red primero, caché como respaldo ──────────────────
// Siempre intenta la red primero y actualiza el caché.
// Solo usa caché si no hay conexión.
self.addEventListener('fetch', event => {
  const url = event.request.url;
 
  // Ignorar peticiones que no sean GET
  if (event.request.method !== 'GET') return;
 
  // Ignorar chrome-extension y otros esquemas no http
  if (!url.startsWith('http')) return;
 
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si la respuesta es válida, actualiza el caché
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sin conexión: sirve desde caché
        return caches.match(event.request);
      })
  );
});