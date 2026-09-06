const CACHE_NAME =
  "lousa-cam-v3";


const ASSETS = [

  "./",

  "./index.html",

  "./app.js",

  "./manifest.json",

  "./icons/logo.png",

  "./icons/icon-192.png",

  "./icons/icon-512.png"

];


/* =====================================================
   INSTALAÇÃO
===================================================== */

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
              ASSETS
            );

          }
        )

    );

    self.skipWaiting();

  }
);


/* =====================================================
   ATIVAÇÃO
===================================================== */

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

    );

    self.clients.claim();

  }
);


/* =====================================================
   CACHE + INTERNET
===================================================== */

self.addEventListener(
  "fetch",
  event => {

    if (
      event.request.method !==
      "GET"
    ) {

      return;

    }


    event.respondWith(

      caches
        .match(
          event.request
        )
        .then(
          cached => {

            if (cached) {

              return cached;

            }


            return fetch(
              event.request
            )
            .then(
              response => {

                return response;

              }
            )
            .catch(
              () => {

                if (
                  event.request.mode ===
                  "navigate"
                ) {

                  return caches.match(
                    "./index.html"
                  );

                }

              }
            );

          }
        )

    );

  }
);
