const CACHE_NAME = 'familia-app-v2';
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
    './manifest.json'
];

self.addEventListener('install', (e) => {
    // Force new service worker to activate immediately
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    // Clean up old caches (v1)
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
    // Take control of all clients immediately
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
