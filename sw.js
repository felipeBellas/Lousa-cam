/* LOUSA CAM — Service Worker | atualização pontual do Editor de Cenas */
const CACHE_NAME = "lousa-cam-v20261013-03";

const APP_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./camera.js",
  "./gallery.js",
  "./video-storage.js",
  "./pencil.js",
  "./manifest.json",
  "./logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const path = url.pathname;

  // Não interceptar recursos de outros domínios.
  if (url.origin !== self.location.origin) return;

  const networkFirst = [
    "/index.html",
    "/app.js",
    "/camera.js",
    "/gallery.js",
    "/video-storage.js",
    "/pencil.js",
    "/manifest.json",
    "/sw.js",
    "/scenes.html",
    "/scenes-pro-layout.css",
    "/scenes-pro-layout.js"
  ].some(file => path.endsWith(file));

  if (networkFirst) {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
              .catch(() => {})
          );
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Não entregar index.html no lugar de JS/CSS/Editor de Cenas.
        if (path.endsWith("/index.html")) {
          const fallback = await caches.match("./index.html");
          if (fallback) return fallback;
        }
        return Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || !response.ok || response.type === "opaque") return response;
        const copy = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy))
            .catch(() => {})
        );
        return response;
      });
    })
  );
});
