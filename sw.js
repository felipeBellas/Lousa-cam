"use strict";

const CACHE_NAME =
  "lousa-cam-v2-20260911-04";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
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
        .then(
          cache =>
            cache.addAll(
              FILES_TO_CACHE
            )
        )

    );

    self.skipWaiting();

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
        .then(
          keys =>
            Promise.all(

              keys
                .filter(
                  key =>
                    key !== CACHE_NAME
                )
                .map(
                  key =>
                    caches.delete(key)
                )

            )
        )
        .then(
          () =>
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

    if (
      request.method !== "GET"
    ) {
      return;
    }

    const url =
      new URL(
        request.url
      );


    /* =====================================================
       ARQUIVOS PRINCIPAIS
       REDE PRIMEIRO
       ===================================================== */

    const isMainFile =
      url.pathname.endsWith(
        "/index.html"
      ) ||

      url.pathname.endsWith(
        "/app.js"
      ) ||

      url.pathname.endsWith(
        "/sw.js"
      ) ||

      url.pathname === "/";


    if (isMainFile) {

      event.respondWith(

        fetch(
          request,
          {
            cache: "no-store"
          }
        )

        .then(
          response => {

            if (
              response &&
              response.ok
            ) {

              const copy =
                response.clone();

              caches
                .open(
                  CACHE_NAME
                )
                .then(
                  cache =>
                    cache.put(
                      request,
                      copy
                    )
                )
                .catch(
                  () => {}
                );

            }

            return response;

          }
        )

        .catch(
          () =>
            caches.match(
              request
            )
        )

      );

      return;

    }


    /* =====================================================
       OUTROS ARQUIVOS
       CACHE PRIMEIRO
       ===================================================== */

    event.respondWith(

      caches
        .match(
          request
        )

        .then(
          cached => {

            if (cached) {
              return cached;
            }

            return fetch(
              request
            )

            .then(
              response => {

                if (
                  !response ||
                  response.status !== 200
                ) {
                  return response;
                }

                const copy =
                  response.clone();

                caches
                  .open(
                    CACHE_NAME
                  )
                  .then(
                    cache =>
                      cache.put(
                        request,
                        copy
                      )
                  )
                  .catch(
                    () => {}
                  );

                return response;

              }
            );

          }
        )

    );

  }
);