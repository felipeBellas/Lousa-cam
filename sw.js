"use strict";


/* =========================================================
   LOUSA CAM 2.0
   SERVICE WORKER

   Atualização:
   02/10/2026

   Estratégia:

   - Arquivos principais:
     NETWORK FIRST

   - Recursos secundários:
     CACHE FIRST

   Isso evita que arquivos JavaScript importantes
   permaneçam presos em versões antigas no PWA.
   ========================================================= */


const CACHE_NAME =
  "lousa-cam-v20261002-01";


/* =========================================================
   ARQUIVOS PRINCIPAIS DO APLICATIVO
   ========================================================= */

const APP_FILES = [

  "./",

  "./index.html",

  "./app.js",

  "./camera.js",

  "./gallery.js",

  "./video-storage.js",

  "./pencil.js",

  "./pencil.css",

  "./gallery.css",

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
        .open(
          CACHE_NAME
        )
        .then(
          cache => {

            return cache.addAll(
              APP_FILES
            );

          }
        )

    );


    /*
      Ativa imediatamente a nova
      versão do Service Worker.
    */
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
          keys => {

            return Promise.all(

              keys

                .filter(
                  key =>
                    key !== CACHE_NAME
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

    );


    /*
      Assume imediatamente o controle
      das páginas abertas.
    */
    self.clients.claim();

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
      O Service Worker só interfere
      em requisições GET.
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


    /* =====================================================
       ARQUIVOS PRINCIPAIS

       NETWORK FIRST

       Sempre tenta buscar primeiro
       a versão atual da rede.

       O cache serve apenas como
       alternativa quando estiver offline.
       ===================================================== */

    const isAppFile =

      url.pathname.endsWith(
        "/index.html"
      ) ||

      url.pathname.endsWith(
        "/app.js"
      ) ||

      url.pathname.endsWith(
        "/camera.js"
      ) ||

      url.pathname.endsWith(
        "/gallery.js"
      ) ||

      url.pathname.endsWith(
        "/video-storage.js"
      ) ||

      url.pathname.endsWith(
        "/pencil.js"
      ) ||

      url.pathname.endsWith(
        "/pencil.css"
      ) ||

      url.pathname.endsWith(
        "/gallery.css"
      ) ||

      url.pathname.endsWith(
        "/manifest.json"
      ) ||

      url.pathname.endsWith(
        "/sw.js"
      );


    if (
      isAppFile
    ) {

      event.respondWith(

        fetch(
          request
        )

          .then(
            response => {

              if (
                response &&
                response.ok
              ) {

                const responseClone =
                  response.clone();


                caches
                  .open(
                    CACHE_NAME
                  )

                  .then(
                    cache => {

                      return cache.put(
                        request,
                        responseClone
                      );

                    }
                  )

                  .catch(
                    () => {}
                  );

              }


              return response;

            }
          )


          .catch(
            () => {

              return caches
                .match(
                  request
                )

                .then(
                  cached => {

                    if (
                      cached
                    ) {

                      return cached;

                    }


                    /*
                      Último fallback:
                      página principal.
                    */
                    return caches.match(
                      "./index.html"
                    );

                  }
                );

            }
          )

      );


      return;

    }


    /* =====================================================
       OUTROS ARQUIVOS

       CACHE FIRST

       Imagens e outros recursos que não
       controlam a lógica principal podem
       continuar usando cache primeiro.
       ===================================================== */

    event.respondWith(

      caches
        .match(
          request
        )

        .then(
          cached => {

            if (
              cached
            ) {

              return cached;

            }


            return fetch(
              request
            )

              .then(
                response => {

                  if (
                    !response ||
                    !response.ok ||
                    response.type ===
                      "opaque"
                  ) {

                    return response;

                  }


                  const responseClone =
                    response.clone();


                  caches
                    .open(
                      CACHE_NAME
                    )

                    .then(
                      cache => {

                        return cache.put(
                          request,
                          responseClone
                        );

                      }
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
