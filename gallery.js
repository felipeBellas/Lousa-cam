"use strict";

/* =========================================================
   LOUSA CAM
   GALERIA DE VÍDEOS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadGallery();

  }
);


/* =========================================================
   CARREGAR GALERIA
   ========================================================= */

async function loadGallery() {

  const galleryContent =
    document.getElementById(
      "galleryContent"
    );


  if (!galleryContent) {
    return;
  }


  /*
    Verifica se a camada de armazenamento
    foi carregada corretamente.
  */
  if (
    !window.VideoStorage ||
    typeof window.VideoStorage.getVideos !==
      "function"
  ) {

    galleryContent.innerHTML =
      "<p>Não foi possível carregar a Galeria.</p>";

    return;
  }


  try {

    const videos =
      await window.VideoStorage.getVideos();


    /*
      Nenhum vídeo salvo.
    */
    if (
      !videos ||
      videos.length === 0
    ) {

      galleryContent.innerHTML =
        "<p>Nenhum vídeo salvo.</p>";

      return;
    }


    /*
      Cria a grade.
    */
    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "gallery-grid";


    /*
      Cria cada miniatura.
    */
    videos.forEach(
      videoData => {

        const item =
          createGalleryItem(
            videoData
          );

        grid.appendChild(
          item
        );

      }
    );


    /*
      Limpa o texto inicial.
    */
    galleryContent.innerHTML =
      "";


    /*
      Exibe a grade.
    */
    galleryContent.appendChild(
      grid
    );


  } catch (error) {

    console.error(
      "Erro ao carregar Galeria:",
      error
    );

    galleryContent.innerHTML =
      "<p>Não foi possível carregar os vídeos.</p>";

  }

}


/* =========================================================
   CRIAR ITEM DA GALERIA
   ========================================================= */

function createGalleryItem(
  videoData
) {

  const item =
    document.createElement(
      "div"
    );

  item.className =
    "gallery-item";


  /*
    Cria uma URL temporária para
    o Blob armazenado no IndexedDB.
  */
  const videoURL =
    URL.createObjectURL(
      videoData.blob
    );


  /*
    Elemento de vídeo.
  */
  const video =
    document.createElement(
      "video"
    );

  video.src =
    videoURL;

 video.preload =
  "auto";

video.muted =
  true;

video.playsInline =
  true;

video.controls =
  false;


/*
  SAFARI / iPHONE

  Depois que os metadados estiverem
  disponíveis, avançamos alguns
  décimos de segundo para que o Safari
  renderize um frame do vídeo.
*/
video.addEventListener(
  "loadedmetadata",
  () => {

    if (
      video.duration &&
      Number.isFinite(
        video.duration
      )
    ) {

      const previewTime =
        Math.min(
          0.2,
          video.duration / 2
        );

      try {

        video.currentTime =
          previewTime;

      } catch (error) {

        console.warn(
          "Não foi possível gerar a prévia:",
          error
        );

      }

    }

  },
  {
    once: true
  }
);


  /*
    Símbolo central de reprodução.
  */
  const play =
    document.createElement(
      "div"
    );

  play.className =
    "gallery-play";

  play.textContent =
    "▶";


  /*
    Montagem do item.
  */
  item.appendChild(
    video
  );

  item.appendChild(
    play
  );


  /*
    Guarda o ID para as próximas
    etapas da Galeria.
  */
  item.dataset.videoId =
    videoData.id;


  return item;

}
