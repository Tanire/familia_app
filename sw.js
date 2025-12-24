const CACHE_NAME = 'familia-app-v5';
const ASSETS = [
    './',
    './index.html',
    './calendar.html',
    './expenses.html',
    './shopping.html',
    './settings.html',
    './css/style.css',
    './js/main.js',
    './js/calendar.js',
    './js/expenses.js',
    './js/shopping.js',
    './js/storage.js',
    './js/sync-service.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
