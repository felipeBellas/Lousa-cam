"use strict";



/* =========================================================
   CARREGAR GALERIA
   ========================================================= */

async function loadGallery() {

  const galleryContent =
  document.getElementById(
    "galleryLayerContent"
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
    "metadata";

  video.muted =
    true;

  video.playsInline =
    true;

  video.controls =
    false;


  /*
    MINIATURA SALVA JUNTO
    COM A GRAVAÇÃO.
  */
  const thumbnail =
    document.createElement(
      "img"
    );

  thumbnail.className =
    "gallery-thumbnail";

  thumbnail.alt =
    "Prévia do vídeo";


  if (videoData.thumbnail) {

    thumbnail.src =
      videoData.thumbnail;

  }


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
    thumbnail
  );

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
