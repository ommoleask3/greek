const CACHE_NAME = 'greek-v3';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/state.js',
  './js/db.js',
  './js/app.js',
  './js/views.js',
  './js/levels.js',
  './js/session.js',
  './js/progress.js',
  './js/animation.js',
  './js/audio.js',
  './js/keyboard.js',
  './js/grammar.js',
  './js/grammar-data.js',
  './js/conjugation.js',
  './js/import.js',
  './js/pokedex.js',
  './js/exam.js',
  './js/exam-data.js',
  './js/thematic-data.js',
  './js/sync.js',
  './plato_head.jpg',
  './_The_School_of_Athens__by_Raffaello_Sanzio_da_Urbino.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Network-first for navigation, cache-first for assets
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
  } else {
    e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
  }
});
