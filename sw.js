"use strict";

/*
  Lousa Cam 2.0
  Service Worker

  Cache atualizado para evitar que o navegador
  continue utilizando versões antigas do app.
*/

const CACHE_NAME =
  "lousa-cam-v3-20260911";

const FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./logo.png"
];

/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then(cache =>
          cache.addAll(FILES)
        )
        .then(() =>
          self.skipWaiting()
        )
    );
  }
);

/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(cacheNames =>
          Promise.all(
            cacheNames
              .filter(
                name =>
                  name !== CACHE_NAME
              )
              .map(
                name =>
                  caches.delete(name)
              )
          )
        )
        .then(() =>
          self.clients.claim()
        )
    );
  }
);

/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;

    /*
      Para navegação e arquivos principais,
      tenta primeiro a rede.

      Isso reduz o risco de o Safari/PWA
      carregar um app.js antigo.
    */
    if (
      request.method !== "GET"
    ) {
      return;
    }

    const url =
      new URL(
        request.url
      );

    const isAppFile =
      url.pathname.endsWith(
        "/index.html"
      ) ||
      url.pathname.endsWith(
        "/app.js"
      ) ||
      url.pathname.endsWith(
        "/manifest.json"
      ) ||
      url.pathname.endsWith(
        "/sw.js"
      );

    if (isAppFile) {

      event.respondWith(

        fetch(request)
          .then(response => {

            if (
              response &&
              response.ok
            ) {

              const copy =
                response.clone();

              caches
                .open(CACHE_NAME)
                .then(cache =>
                  cache.put(
                    request,
                    copy
                  )
                );
            }

            return response;
          })
          .catch(
            () =>
              caches.match(request)
          )
      );

      return;
    }

    /*
      Outros arquivos:
      cache primeiro, rede como fallback.
    */
    event.respondWith(

      caches
        .match(request)
        .then(cached => {

          if (cached) {
            return cached;
          }

          return fetch(request)
            .then(response => {

              if (
                response &&
                response.ok
              {

                const copy =
                  response.clone();

                caches
                  .open(
                    CACHE_NAME
                  )
                  .then(cache =>
                    cache.put(
                      request,
                      copy
                    )
                  );
              }

              return response;
            });
        })
    );
  }
);
