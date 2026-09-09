/* =========================================================
   LOUSA CAM
   SERVICE WORKER
   Build: 2026-09-09-02
   ========================================================= */

const CACHE_NAME =
  "lousa-cam-v20260909-02";


const APP_FILES = [

  "./",

  "./index.html",

  "./app.js?v=20260909-02",

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
          cache =>
            cache.addAll(
              APP_FILES
            )
        )

        .then(
          () =>
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

        .then(
          keys =>

            Promise.all(

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

    if (
      event.request.method !==
      "GET"
    ) {

      return;
    }


    const request =
      event.request;


    const url =
      new URL(
        request.url
      );


    /*
     * app.js e index.html:
     *
     * Sempre tentamos buscar
     * a versão nova primeiro.
     */

    if (
      url.pathname.endsWith(
        "/app.js"
      ) ||
      url.pathname.endsWith(
        "/index.html"
      ) ||
      url.pathname.endsWith(
        "/sw.js"
      )
    ) {

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
     * Outros arquivos:
     *
     * Primeiro cache.
     * Se não houver, rede.
     */

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
