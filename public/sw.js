const CACHE = "prospectia-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["/offline", "/icons/icon-192.png", "/icons/icon-512.png"])
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Network-first for API and navigation
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache static assets
        if (
          url.pathname.startsWith("/icons/") ||
          url.pathname.startsWith("/_next/static/")
        ) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(
          (cached) => cached ?? caches.match(OFFLINE_URL)
        )
      )
  );
});
