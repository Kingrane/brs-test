/* SuperBRS service worker.
 *
 * Стратегия намеренно простая, чтобы установленное приложение стартовало
 * из кэша, но никогда не залипало на старой версии:
 *
 *   HTML (navigation)  — network-first: свежая разметка всегда выигрывает,
 *                        кэш используется только когда сети нет.
 *   /assets/ /fonts/   — cache-first: хэшированные имена, содержимое неизменно.
 *   /api/*             — не перехватываем вообще (оценки не кэшируются).
 */

const STATIC_CACHE = "superbrs-static-v1";
const SHELL_CACHE = "superbrs-shell-v1";
const SHELL_URL = "/";

const STATIC_PATH = /^\/(assets|fonts|icons)\//;
const STATIC_FILE = /\.(?:css|js|woff2|svg|png|ico|webmanifest)$/;

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) => cache.add(new Request(SHELL_URL, { cache: "reload" })))
            .catch(() => undefined)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== SHELL_CACHE)
                    .map((key) => caches.delete(key))
            );
            await self.clients.claim();
        })()
    );
});

async function networkFirstNavigation(request) {
    const cache = await caches.open(SHELL_CACHE);
    try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(SHELL_URL, fresh.clone());
        return fresh;
    } catch {
        const cached = await cache.match(SHELL_URL);
        if (cached) return cached;
        return Response.error();
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/")) return;

    if (request.mode === "navigate") {
        event.respondWith(networkFirstNavigation(request));
        return;
    }

    if (STATIC_PATH.test(url.pathname) || STATIC_FILE.test(url.pathname)) {
        event.respondWith(cacheFirst(request));
    }
});
