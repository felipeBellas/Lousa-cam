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

  item.addEventListener(
    "click",
    () => {
      openGalleryVideo(
        videoData
      );
    }
  );

  return item;
}

function openGalleryVideo(
  videoData
) {
  const galleryLayer =
    document.getElementById(
      "galleryLayer"
    );

  if (!galleryLayer) {
    return;
  }

  const viewer =
    document.createElement(
      "div"
    );

  viewer.className =
    "gallery-viewer";

  const videoURL =
    URL.createObjectURL(
      videoData.blob
    );

  const video =
    document.createElement(
      "video"
    );

  video.src =
    videoURL;

  video.controls =
    true;

  video.autoplay =
    true;

  video.playsInline =
    true;

  const closeButton =
    document.createElement(
      "button"
    );

  closeButton.type =
    "button";

  closeButton.className =
    "gallery-viewer-close";

  closeButton.textContent =
    "×";

  closeButton.setAttribute(
    "aria-label",
    "Fechar vídeo"
  );

     /*
    MENU DE OPÇÕES DO VÍDEO
  */
  const menuButton =
    document.createElement(
      "button"
    );

  menuButton.type =
    "button";

  menuButton.className =
    "gallery-viewer-menu";

    menuButton.textContent =
    "•••";

  menuButton.setAttribute(
    "aria-label",
    "Opções do vídeo"
  );


  const optionsMenu =
    document.createElement(
      "div"
    );

  optionsMenu.className =
    "gallery-video-options";


  const downloadButton =
    document.createElement(
      "button"
    );

  downloadButton.type =
    "button";

  downloadButton.textContent =
    "Baixar";


  const deleteButton =
    document.createElement(
      "button"
    );

  deleteButton.type =
    "button";

  deleteButton.textContent =
    "Excluir";

  deleteButton.className =
    "gallery-delete-video";


  optionsMenu.appendChild(
    downloadButton
  );

  optionsMenu.appendChild(
    deleteButton
  );
   
  function closeViewer() {

    video.pause();

    URL.revokeObjectURL(
      videoURL
    );

    viewer.remove();
  }

     /*
    ABRIR / FECHAR MENU
  */
  menuButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      optionsMenu.classList.toggle(
        "show"
      );
    }
  );


  /*
    BAIXAR VÍDEO
  */
  downloadButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      const link =
        document.createElement(
          "a"
        );

      link.href =
        videoURL;

      const extension =
        videoData.type &&
        videoData.type.includes(
          "mp4"
        )
          ? "mp4"
          : "webm";

      link.download =
        `Lousa-Cam-${videoData.id}.${extension}`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      optionsMenu.classList.remove(
        "show"
      );
    }
  );


  /*
    EXCLUIR VÍDEO
  */
  deleteButton.addEventListener(
    "click",
    async event => {

      event.stopPropagation();

      const confirmed =
        window.confirm(
          "Excluir este vídeo da Galeria?"
        );

      if (!confirmed) {
        return;
      }

      try {

        await window.VideoStorage.deleteVideo(
          videoData.id
        );

        closeViewer();

        await loadGallery();

      } catch (error) {

        console.error(
          "Erro ao excluir vídeo:",
          error
        );

        window.alert(
          "Não foi possível excluir o vídeo."
        );
      }
    }
  );

   
  closeButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      closeViewer();
    }
  );

  viewer.addEventListener(
    "click",
    event => {

      if (
        event.target === viewer
      ) {
        closeViewer();
      }
    }
  );

    viewer.appendChild(
    video
  );

  viewer.appendChild(
    menuButton
  );

  viewer.appendChild(
    optionsMenu
  );

  viewer.appendChild(
    closeButton
  );

  galleryLayer.appendChild(
    viewer
  );
}
