const CACHE_NAME = 'familia-app-v1.22.4';
const ASSETS = [
    './',
    './index.html',
    './calendar.html',
    './expenses.html',
    './shopping.html',
    './recipes.html',
    './settings.html',
    './css/style.css',
    './js/storage.js',
    './js/sync-service.js',
    './js/notifications.js',
    './js/main.js',
    './js/calendar.js',
    './js/expenses.js',
    './js/shopping.js',
    './js/recipes.js',
    './js/charts.js',
    './js/ocr-service.js',
    './manifest.json',
    './assets/family_photo.jpg',
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
    const url = new URL(e.request.url);

    // Never intercept non-GET requests or GitHub API sync calls
    if (e.request.method !== 'GET' || url.hostname.includes('api.github.com') || url.hostname.includes('github.com')) {
        return;
    }

    // 1. Navigation / HTML: Network-first with cache fallback
    if (e.request.mode === 'navigate' || (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html'))) {
        e.respondWith(
            fetch(e.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    return caches.match(e.request).then((cached) => cached || caches.match('./index.html'));
                })
        );
        return;
    }

    // 2. Static Assets: Cache-first, with background network fetch and cache update
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(e.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
                    }
                    return networkResponse;
                })
                .catch((err) => {
                    console.warn('SW fetch offline fallback:', e.request.url);
                    return null;
                });
        })
    );
});
