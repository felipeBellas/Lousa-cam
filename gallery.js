"use strict";

/* =========================================================
   ESTADO DE SELEÇÃO DA GALERIA
   ========================================================= */

const selectedGalleryVideos =
  new Set();

/* =========================================================
   CONFIRMAÇÃO INTERNA DA GALERIA

   Substitui window.confirm() para evitar que o popup
   nativo do navegador interfira no preview da câmera,
   principalmente no Safari/PWA do iPhone.
   ========================================================= */

/* =========================================================
   CONFIRMAÇÃO INTERNA DA GALERIA
   Liquid Glass — Lousa Cam 2.0

   Substitui window.confirm().
   Não interfere na câmera ou no MediaStream.
   ========================================================= */

function galleryConfirm(message) {

  return new Promise(resolve => {

    /* =====================================================
       OVERLAY
       ===================================================== */

    const overlay =
      document.createElement("div");

    overlay.style.position =
      "fixed";

    overlay.style.inset =
      "0";

    overlay.style.zIndex =
      "999999";

    overlay.style.display =
      "flex";

    overlay.style.alignItems =
      "center";

    overlay.style.justifyContent =
      "center";

    overlay.style.padding =
      "24px";

    overlay.style.background =
      "rgba(0, 0, 0, 0.42)";

    overlay.style.backdropFilter =
      "blur(10px)";

    overlay.style.webkitBackdropFilter =
      "blur(10px)";

    overlay.style.opacity =
      "0";

    overlay.style.transition =
      "opacity 0.18s ease";


    /* =====================================================
       PAINEL
       ===================================================== */

    const panel =
      document.createElement("div");

    panel.style.width =
      "min(360px, calc(100vw - 40px))";

    panel.style.padding =
      "22px";

    panel.style.borderRadius =
      "24px";

    panel.style.background =
      "rgba(28, 28, 30, 0.88)";

    panel.style.border =
      "1px solid rgba(255, 255, 255, 0.18)";

    panel.style.boxShadow =
      "0 18px 50px rgba(0, 0, 0, 0.48)";

    panel.style.backdropFilter =
      "blur(28px) saturate(180%)";

    panel.style.webkitBackdropFilter =
      "blur(28px) saturate(180%)";

    panel.style.transform =
      "scale(0.94)";

    panel.style.opacity =
      "0";

    panel.style.transition =
      "transform 0.18s ease, opacity 0.18s ease";

    panel.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif";


    /* =====================================================
       TÍTULO
       ===================================================== */

    const title =
      document.createElement("div");

    title.textContent =
      "Excluir vídeo?";

    title.style.margin =
      "0 0 8px";

    title.style.color =
      "#ffffff";

    title.style.fontSize =
      "20px";

    title.style.fontWeight =
      "700";

    title.style.letterSpacing =
      "-0.3px";

    title.style.textAlign =
      "center";


    /* =====================================================
       MENSAGEM
       ===================================================== */

    const text =
      document.createElement("div");

    text.textContent =
      message;

    text.style.margin =
      "0 0 22px";

    text.style.color =
      "rgba(255, 255, 255, 0.72)";

    text.style.fontSize =
      "14px";

    text.style.fontWeight =
      "400";

    text.style.lineHeight =
      "1.45";

    text.style.textAlign =
      "center";


    /* =====================================================
       ÁREA DOS BOTÕES
       ===================================================== */

    const actions =
      document.createElement("div");

    actions.style.display =
      "flex";

    actions.style.gap =
      "10px";

    actions.style.width =
      "100%";


    /* =====================================================
       CANCELAR
       ===================================================== */

    const cancelButton =
      document.createElement("button");

    cancelButton.type =
      "button";

    cancelButton.textContent =
      "Cancelar";

    cancelButton.style.flex =
      "1";

    cancelButton.style.width =
      "auto";

    cancelButton.style.height =
      "46px";

    cancelButton.style.borderRadius =
      "14px";

    cancelButton.style.border =
      "1px solid rgba(255, 255, 255, 0.16)";

    cancelButton.style.background =
      "rgba(255, 255, 255, 0.08)";

    cancelButton.style.color =
      "#ffffff";

    cancelButton.style.fontSize =
      "15px";

    cancelButton.style.fontWeight =
      "600";

    cancelButton.style.boxShadow =
      "none";

    cancelButton.style.backdropFilter =
      "none";

    cancelButton.style.webkitBackdropFilter =
      "none";

    cancelButton.style.cursor =
      "pointer";

    cancelButton.style.touchAction =
      "manipulation";


    /* =====================================================
       EXCLUIR
       ===================================================== */

    const deleteButton =
      document.createElement("button");

    deleteButton.type =
      "button";

    deleteButton.textContent =
      "Excluir";

    deleteButton.style.flex =
      "1";

    deleteButton.style.width =
      "auto";

    deleteButton.style.height =
      "46px";

    deleteButton.style.borderRadius =
      "14px";

    deleteButton.style.border =
      "1px solid rgba(255, 69, 58, 0.55)";

    deleteButton.style.background =
      "rgba(255, 59, 48, 0.90)";

    deleteButton.style.color =
      "#ffffff";

    deleteButton.style.fontSize =
      "15px";

    deleteButton.style.fontWeight =
      "700";

    deleteButton.style.boxShadow =
      "0 6px 18px rgba(255, 59, 48, 0.20)";

    deleteButton.style.backdropFilter =
      "none";

    deleteButton.style.webkitBackdropFilter =
      "none";

    deleteButton.style.cursor =
      "pointer";

    deleteButton.style.touchAction =
      "manipulation";


    /* =====================================================
       FECHAMENTO
       ===================================================== */

    let finished =
      false;


    function finish(result) {

      if (finished) {
        return;
      }

      finished =
        true;


      overlay.style.opacity =
        "0";

      panel.style.opacity =
        "0";

      panel.style.transform =
        "scale(0.94)";


      window.setTimeout(() => {

        if (
          overlay.parentNode
        ) {

          overlay.parentNode.removeChild(
            overlay
          );

        }

        resolve(result);

      }, 180);

    }


    /* =====================================================
       EVENTOS
       ===================================================== */

    cancelButton.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();

        finish(false);

      }
    );


    deleteButton.addEventListener(
      "click",
      event => {

        event.preventDefault();
        event.stopPropagation();

        finish(true);

      }
    );


    overlay.addEventListener(
      "click",
      event => {

        if (
          event.target === overlay
        ) {

          finish(false);

        }

      }
    );


    panel.addEventListener(
      "click",
      event => {

        event.stopPropagation();

      }
    );


    /* =====================================================
       MONTAGEM
       ===================================================== */

    actions.appendChild(
      cancelButton
    );

    actions.appendChild(
      deleteButton
    );


    panel.appendChild(
      title
    );

    panel.appendChild(
      text
    );

    panel.appendChild(
      actions
    );


    overlay.appendChild(
      panel
    );


    document.body.appendChild(
      overlay
    );


    /* =====================================================
       ANIMAÇÃO DE ENTRADA
       ===================================================== */

    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        overlay.style.opacity =
          "1";

        panel.style.opacity =
          "1";

        panel.style.transform =
          "scale(1)";

      });

    });

  });

}
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

      selectedGalleryVideos.clear();

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
      BARRA DE CONTROLES DA GALERIA
    */
    const toolbar =
      document.createElement(
        "div"
      );

    toolbar.className =
      "gallery-toolbar";


    /*
      SELECIONAR TUDO
    */
    const selectAllButton =
      document.createElement(
        "button"
      );

    selectAllButton.type =
      "button";

    selectAllButton.className =
      "gallery-select-all";

    selectAllButton.textContent =
      "Selecionar tudo";


    /*
      LIMPAR SELECIONADOS
    */
    const clearButton =
      document.createElement(
        "button"
      );

    clearButton.type =
      "button";

    clearButton.className =
      "gallery-clear-selected";

    clearButton.textContent =
      "Limpar";


    toolbar.appendChild(
      selectAllButton
    );

    toolbar.appendChild(
      clearButton
    );
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
      Exibe controles e grade.
    */
    galleryContent.appendChild(
      toolbar
    );

    galleryContent.appendChild(
      grid
    );

    /*
      SELECIONAR / DESMARCAR TODOS
    */
    selectAllButton.addEventListener(
      "click",
      async () => {

        const allSelected =
          videos.every(
            videoData =>
              selectedGalleryVideos.has(
                videoData.id
              )
          );


        selectedGalleryVideos.clear();


        if (!allSelected) {

          videos.forEach(
            videoData => {

              selectedGalleryVideos.add(
                videoData.id
              );

            }
          );

        }


        await loadGallery();
      }
    );


    /*
      LIMPAR VÍDEOS SELECIONADOS
    */
    clearButton.addEventListener(
      "click",
      async () => {

        if (
          selectedGalleryVideos.size === 0
        ) {

          window.alert(
            "Selecione pelo menos um vídeo."
          );

          return;
        }


        const totalSelected =
          selectedGalleryVideos.size;


        const confirmed =
  await galleryConfirm(
    totalSelected === 1
      ? "Excluir o vídeo selecionado da Galeria?"
      : `Excluir os ${totalSelected} vídeos selecionados da Galeria?`
  );


        if (!confirmed) {
          return;
        }


        try {

          const idsToDelete =
            Array.from(
              selectedGalleryVideos
            );


          for (
            const videoId
            of idsToDelete
          ) {

            await window.VideoStorage.deleteVideo(
              videoId
            );

          }


          selectedGalleryVideos.clear();


          await loadGallery();


        } catch (error) {

          console.error(
            "Erro ao excluir vídeos selecionados:",
            error
          );

          window.alert(
            "Não foi possível excluir os vídeos selecionados."
          );

        }
      }
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
    INDICADOR DE SELEÇÃO
  */
  const selectionIndicator =
    document.createElement(
      "div"
    );

  selectionIndicator.className =
    "gallery-selection-indicator";


  if (
    selectedGalleryVideos.has(
      videoData.id
    )
  ) {

    selectionIndicator.classList.add(
      "selected"
    );

    selectionIndicator.textContent =
      "✓";

  }


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

   item.appendChild(
    selectionIndicator
  );


  /*
    Guarda o ID para as próximas
    etapas da Galeria.
  */
    item.dataset.videoId =
    videoData.id;

     item.addEventListener(
    "click",
    async () => {

      /*
        Se já existem vídeos selecionados,
        o toque serve para marcar/desmarcar.
      */
      if (
        selectedGalleryVideos.size > 0
      ) {

        if (
          selectedGalleryVideos.has(
            videoData.id
          )
        ) {

          selectedGalleryVideos.delete(
            videoData.id
          );

        } else {

          selectedGalleryVideos.add(
            videoData.id
          );

        }


        await loadGallery();

        return;
      }


      /*
        Sem seleção ativa,
        o toque abre normalmente o vídeo.
      */
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
  await galleryConfirm(
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
