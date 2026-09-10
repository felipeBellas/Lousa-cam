const CACHE_NAME = "lousa-cam-v20260911-02";

const APP_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./logo.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const url = new URL(request.url);

  /*
   * Arquivos principais do aplicativo:
   * sempre tenta buscar a versão atual da internet.
   * Se estiver sem internet, utiliza o cache.
   */
  const isAppFile =
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/manifest.json") ||
    url.pathname.endsWith("/sw.js") ||
    url.pathname.endsWith("/logo.png");

  if (isAppFile) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
              .catch(() => {});
          }

          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            if (cached) return cached;

            return caches.match("./index.html");
          });
        })
    );

    return;
  }

  /*
   * Outros arquivos:
   * tenta cache primeiro e depois internet.
   */
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request)
          .then(response => {
            if (response && response.ok) {
              const copy = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => cache.put(request, copy))
                .catch(() => {});
            }

            return response;
          });
      })
  );
});
