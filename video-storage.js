"use strict";

/* =========================================================
   LOUSA CAM
   CAMADA DE ARMAZENAMENTO DE VÍDEOS

   PWA:
   IndexedDB

   Futuramente:
   esta camada poderá ser adaptada para armazenamento nativo
   sem alterar a interface da Galeria.
   ========================================================= */

const VideoStorage = (() => {

  const DB_NAME =
    "lousa-cam-gallery";

  const DB_VERSION =
    1;

  const STORE_NAME =
    "videos";


  /* =======================================================
     ABRIR BANCO
     ======================================================= */

  function openDatabase() {

    return new Promise(
      (resolve, reject) => {

        const request =
          indexedDB.open(
            DB_NAME,
            DB_VERSION
          );


        request.onupgradeneeded =
          event => {

            const db =
              event.target.result;


            if (
              !db.objectStoreNames.contains(
                STORE_NAME
              )
            ) {

              const store =
                db.createObjectStore(
                  STORE_NAME,
                  {
                    keyPath: "id"
                  }
                );


              store.createIndex(
                "createdAt",
                "createdAt",
                {
                  unique: false
                }
              );

            }

          };


        request.onsuccess =
          () => {

            resolve(
              request.result
            );

          };


        request.onerror =
          () => {

            reject(
              request.error
            );

          };

      }
    );

  }


  /* =======================================================
     GERAR ID
     ======================================================= */

  function createId() {

    return (
      "video_" +
      Date.now().toString(36) +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 8)
    );

  }


  /* =======================================================
     SALVAR VÍDEO
     ======================================================= */

  async function saveVideo(
    blob
  ) {

    if (
      !blob ||
      !blob.size
    ) {

      throw new Error(
        "Vídeo vazio"
      );

    }


    const db =
      await openDatabase();


    const video = {

      id:
        createId(),

      createdAt:
        Date.now(),

      type:
        blob.type ||
        "video/webm",

      size:
        blob.size,

      blob:
        blob

    };


    return new Promise(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            STORE_NAME,
            "readwrite"
          );


        const store =
          transaction.objectStore(
            STORE_NAME
          );


        store.add(
          video
        );


        transaction.oncomplete =
          () => {

            db.close();

            resolve(
              video
            );

          };


        transaction.onerror =
          () => {

            db.close();

            reject(
              transaction.error
            );

          };


        transaction.onabort =
          () => {

            db.close();

            reject(
              transaction.error
            );

          };

      }
    );

  }


  /* =======================================================
     LISTAR VÍDEOS
     ======================================================= */

  async function getVideos() {

    const db =
      await openDatabase();


    return new Promise(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            STORE_NAME,
            "readonly"
          );


        const store =
          transaction.objectStore(
            STORE_NAME
          );


        const request =
          store.getAll();


        request.onsuccess =
          () => {

            const videos =
              request.result || [];


            videos.sort(
              (a, b) =>
                b.createdAt -
                a.createdAt
            );


            db.close();

            resolve(
              videos
            );

          };


        request.onerror =
          () => {

            db.close();

            reject(
              request.error
            );

          };

      }
    );

  }


  /* =======================================================
     BUSCAR UM VÍDEO
     ======================================================= */

  async function getVideo(
    id
  ) {

    const db =
      await openDatabase();


    return new Promise(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            STORE_NAME,
            "readonly"
          );


        const store =
          transaction.objectStore(
            STORE_NAME
          );


        const request =
          store.get(
            id
          );


        request.onsuccess =
          () => {

            db.close();

            resolve(
              request.result ||
              null
            );

          };


        request.onerror =
          () => {

            db.close();

            reject(
              request.error
            );

          };

      }
    );

  }


  /* =======================================================
     EXCLUIR VÍDEO
     ======================================================= */

  async function deleteVideo(
    id
  ) {

    const db =
      await openDatabase();


    return new Promise(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            STORE_NAME,
            "readwrite"
          );


        const store =
          transaction.objectStore(
            STORE_NAME
          );


        store.delete(
          id
        );


        transaction.oncomplete =
          () => {

            db.close();

            resolve(
              true
            );

          };


        transaction.onerror =
          () => {

            db.close();

            reject(
              transaction.error
            );

          };

      }
    );

  }


  /* =======================================================
     API PÚBLICA
     ======================================================= */

  return {

    saveVideo,

    getVideos,

    getVideo,

    deleteVideo

  };

})();
