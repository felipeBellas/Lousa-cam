"use strict";

/*
===============================================================
LOUSA CAM - SERVICE WORKER
Versão: 20260910-01

Objetivo:
- Evitar que Safari/PWA fique preso em versão antiga
- Atualizar index.html e app.js
- Manter recursos disponíveis offline
===============================================================
*/

const CACHE_NAME =
  "lousa-cam-v20260910-01";


const APP_SHELL = [

  "./",

  "./index.html",

  "./app.js?v=20260910-01",

  "./manifest.json",

  "./logo.png"
];


/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(
          cache =>
            cache.addAll(
              APP_SHELL
            )
        )

        .then(
          () =>
            self.skipWaiting()
        )
    );
  }
);


/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()

        .then(
          keys => {

            return Promise.all(

              keys
                .filter(
                  key =>
                    key !==
                    CACHE_NAME
                )

                .map(
                  key =>
                    caches.delete(
                      key
                    )
                )
            );
          }
        )

        .then(
          () =>
            self.clients.claim()
        )
    );
  }
);


/* ============================================================
   MESSAGE
   ============================================================ */

self.addEventListener(
  "message",
  event => {

    if (
      event.data &&
      event.data.type ===
        "SKIP_WAITING"
    ) {

      self.skipWaiting();
    }
  }
);


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;

    /*
     Somente GET.
    */

    if (
      request.method !==
      "GET"
    ) {

      return;
    }


    const url =
      new URL(
        request.url
      );


    /*
     Arquivos principais:
     SEMPRE tenta buscar uma versão nova
     na rede primeiro.
    */

    const isAppFile =
      url.pathname.endsWith(
        "/index.html"
      ) ||

      url.pathname.endsWith(
        "/app.js"
      ) ||

      url.pathname.endsWith(
        "/sw.js"
      ) ||

      url.pathname ===
        "/";


    if (isAppFile) {

      event.respondWith(

        fetch(
          request,
          {
            cache:
              "no-store"
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


    /*
     Outros arquivos:
     cache primeiro,
     rede como alternativa.
    */

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
                    response.status !==
                      200
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
              )

              .catch(
                () =>
                  caches.match(
                    "./index.html"
                  )
              );
          }
        )
    );
  }
);
