"use strict";

/* =========================================================
   LOUSA CAM 2.0
   SERVICE WORKER

   Versão: 20261006-01

   Estratégia:
   - arquivos principais: NETWORK FIRST
   - recursos estáticos locais: CACHE FIRST
   - recursos externos: não interceptados
   - caches antigos: removidos na ativação
   ========================================================= */


/* =========================================================
   CACHE
   ========================================================= */

const CACHE_NAME =
  "lousa-cam-v20261006-01";


/* =========================================================
   ARQUIVOS ESSENCIAIS DO APLICATIVO

   IMPORTANTE:
   Todos os arquivos abaixo precisam existir no repositório.
   ========================================================= */

const APP_FILES = [

  "./",

  "./index.html",

  "./app.js",

  "./camera.js",

  "./gallery.js",

  "./teleprompter.js",

  "./video-storage.js",

  "./pencil.js",

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

        .then(cache => {

          return cache.addAll(
            APP_FILES
          );

        })

    );


    /*
      Permite que a nova versão do Service Worker
      avance imediatamente para a próxima etapa.
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

        .then(keys => {

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

        })

        .then(() => {

          /*
            Faz esta versão assumir imediatamente
            as páginas controladas pelo Service Worker.
          */

          return self.clients.claim();

        })

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


    /* =====================================================
       SOMENTE REQUISIÇÕES GET
       ===================================================== */

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


    /* =====================================================
       SEGURANÇA

       Não interceptamos nem armazenamos recursos
       provenientes de outros domínios.

       Isso evita que o Service Worker interfira
       futuramente com:

       - APIs externas
       - autenticação
       - OAuth
       - YouTube
       - outros serviços externos
       ===================================================== */

    if (
      url.origin !==
      self.location.origin
    ) {

      return;

    }


    /* =====================================================
       ARQUIVOS PRINCIPAIS

       NETWORK FIRST

       Sempre tenta buscar a versão mais recente.

       Se a rede falhar:
       usa a versão armazenada no cache.
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
        "/teleprompter.js"
      ) ||

      url.pathname.endsWith(
        "/video-storage.js"
      ) ||

      url.pathname.endsWith(
        "/pencil.js"
      ) ||

      url.pathname.endsWith(
        "/manifest.json"
      ) ||

      url.pathname.endsWith(
        "/sw.js"
      );


    /* =====================================================
       NETWORK FIRST
       ===================================================== */

    if (isAppFile) {

      event.respondWith(

        fetch(request)

          .then(response => {

            /*
              Só armazenamos respostas válidas.
            */

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

                .then(cache => {

                  return cache.put(
                    request,
                    responseClone
                  );

                })

                .catch(() => {

                  /*
                    Uma falha ao gravar no cache
                    não pode derrubar o aplicativo.
                  */

                });

            }


            return response;

          })


          .catch(() => {

            /*
              Sem conexão:
              procura exatamente o recurso solicitado.
            */

            return caches
              .match(request)

              .then(cached => {

                if (cached) {

                  return cached;

                }


                /*
                  Último fallback.

                  Se o recurso específico não estiver
                  disponível, tentamos a interface
                  principal armazenada.
                */

                return caches.match(
                  "./index.html"
                );

              });

          })

      );


      return;

    }


    /* =====================================================
       OUTROS RECURSOS LOCAIS

       CACHE FIRST

       Exemplos:

       - imagens
       - CSS
       - ícones
       - banco visual
       - outros arquivos estáticos
       ===================================================== */

    event.respondWith(

      caches
        .match(request)

        .then(cached => {

          /*
            Encontrou no cache.
          */

          if (cached) {

            return cached;

          }


          /*
            Não encontrou:
            busca na rede.
          */

          return fetch(request)

            .then(response => {

              /*
                Não armazenamos respostas inválidas.
              */

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


              /*
                Armazena o recurso para
                utilizações posteriores.
              */

              caches
                .open(
                  CACHE_NAME
                )

                .then(cache => {

                  return cache.put(
                    request,
                    responseClone
                  );

                })

                .catch(() => {

                  /*
                    Falha de cache não deve
                    interromper o aplicativo.
                  */

                });


              return response;

            });

        })

    );

  }
);
