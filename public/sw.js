/* Service worker de Kricar — coque d'application hors ligne.
 *
 * Principes :
 *  - JAMAIS de cache pour l'API (/api/...) ni pour les requêtes non-GET : les données
 *    métier (contrats, paiements) doivent toujours venir du serveur.
 *  - Fichiers statiques versionnés (/assets/*-hash.js|css, polices, images) : cache d'abord.
 *  - Pages (navigation) : réseau d'abord ; si hors ligne, on sert la coque (/index.html)
 *    ou, à défaut, la page /offline.html.
 *  - Changer CACHE_VERSION invalide l'ancien cache à l'activation.
 */
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `kricar-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `kricar-assets-${CACHE_VERSION}`;
const SHELL_URLS = ['/', '/offline.html', '/manifest.webmanifest', '/logo.png', '/pwa-192.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => k.startsWith('kricar-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
                        .map((k) => caches.delete(k)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

const isStaticAsset = (url) =>
    url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || /\.(?:png|svg|webp|woff2?)$/.test(url.pathname));

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    // L'API (même origine via proxy ou autre origine) n'est jamais interceptée.
    if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => (await caches.match('/')) || (await caches.match('/offline.html'))),
        );
        return;
    }

    if (isStaticAsset(url)) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone();
                            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
                        }
                        return response;
                    }),
            ),
        );
    }
});
