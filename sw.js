const CACHE_NAME = "lousa-cam-v20260911-04";

const APP_FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./logo.png"
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => {

        return cache.addAll(APP_FILES);

      })

  );

  self.skipWaiting();

});


/* =========================================================
   ACTIVATE
   ========================================================= */

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

  );

  self.clients.claim();

});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", event => {

  const request = event.request;

  if (request.method !== "GET") {
    return;
  }


  const url = new URL(request.url);

  const isAppFile =
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/app.js") ||
    url.pathname.endsWith("/manifest.json") ||
    url.pathname.endsWith("/sw.js");


  /* =======================================================
     ARQUIVOS PRINCIPAIS
     
     SEMPRE tenta buscar a versão atual primeiro.
     Só usa cache se estiver sem internet.
     ======================================================= */

  if (isAppFile) {

    event.respondWith(

      fetch(request)

        .then(response => {

          if (
            response &&
            response.ok
          ) {

            const responseClone =
              response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {

                cache.put(
                  request,
                  responseClone
                );

              })
              .catch(() => {});

          }

          return response;

        })

        .catch(() => {

          return caches.match(request)
            .then(cached => {

              if (cached) {
                return cached;
              }

              return caches.match("./index.html");

            });

        })

    );

    return;

  }


  /* =======================================================
     OUTROS ARQUIVOS
     
     Cache primeiro.
     ======================================================= */

  event.respondWith(

    caches.match(request)

      .then(cached => {

        if (cached) {
          return cached;
        }


        return fetch(request)

          .then(response => {

            if (
              !response ||
              !response.ok ||
              response.type === "opaque"
            ) {

              return response;

            }


            const responseClone =
              response.clone();


            caches.open(CACHE_NAME)
              .then(cache => {

                cache.put(
                  request,
                  responseClone
                );

              })
              .catch(() => {});


            return response;

          });

      })

  );

});
