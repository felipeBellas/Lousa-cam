"use strict";


/* =========================================================
   LOUSA CAM — PENCIL
   ETAPA 1

   Interface isolada.

   Não controla desenho.
   Não altera câmera.
   Não altera canvas.
   ========================================================= */


(() => {


  /* =======================================================
     ELEMENTOS EXISTENTES
     ======================================================= */

  const settingsButton =
    document.getElementById(
      "settings"
    );


  const oldToolsPanel =
    document.getElementById(
      "tools"
    );


  /*
    Segurança:

    Se o botão principal da caneta
    não existir, não fazemos nada.
  */

  if (!settingsButton) {

    console.warn(
      "Pencil: botão settings não encontrado."
    );

    return;

  }


  /* =======================================================
     CRIAR PENCIL
     ======================================================= */

  const pencilFloat =
    document.createElement(
      "div"
    );


  pencilFloat.id =
    "pencilFloat";


  pencilFloat.className =
    "compact";


  pencilFloat.setAttribute(
    "aria-hidden",
    "true"
  );


  /* =======================================================
     BOTÃO DA PENCIL
     ======================================================= */

  const pencilToggle =
    document.createElement(
      "button"
    );


  pencilToggle.id =
    "pencilToggle";


  pencilToggle.type =
    "button";


  pencilToggle.textContent =
    "✎";


  pencilToggle.setAttribute(
    "aria-label",
    "Abrir Pencil"
  );


  /* =======================================================
     CONTEÚDO TEMPORÁRIO
     ======================================================= */

  const pencilContent =
    document.createElement(
      "div"
    );


  pencilContent.id =
    "pencilContent";


  pencilContent.textContent =
    "Ferramentas";


  /* =======================================================
     MONTAGEM
     ======================================================= */

  pencilFloat.appendChild(
    pencilToggle
  );


  pencilFloat.appendChild(
    pencilContent
  );


  document.body.appendChild(
    pencilFloat
  );


  /* =======================================================
     ESTADO
     ======================================================= */

  let pencilVisible =
    false;


  let pencilExpanded =
    false;


  /* =======================================================
     MOSTRAR / ESCONDER
     ======================================================= */

  function setPencilVisible(
    visible
  ) {

    pencilVisible =
      visible;


    pencilFloat.classList.toggle(
      "show",
      visible
    );


    pencilFloat.setAttribute(
      "aria-hidden",
      visible
        ? "false"
        : "true"
    );


    /*
      Ao esconder, volta ao
      estado compacto.
    */

    if (!visible) {

      pencilExpanded =
        false;


      pencilFloat.classList.remove(
        "expanded"
      );


      pencilFloat.classList.add(
        "compact"
      );

    }

  }


  /* =======================================================
     EXPANDIR / RECOLHER
     ======================================================= */

  function togglePencilExpanded() {

    pencilExpanded =
      !pencilExpanded;


    pencilFloat.classList.toggle(
      "expanded",
      pencilExpanded
    );


    pencilFloat.classList.toggle(
      "compact",
      !pencilExpanded
    );

  }


  /* =======================================================
     BOTÃO PRINCIPAL DA CANETA

     Usamos capture para interceptar
     somente este clique antes do
     listener antigo do app.js.
     ======================================================= */

  settingsButton.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();

      event.stopImmediatePropagation();


      /*
        Garante que o painel antigo
        fique fechado.
      */

      if (oldToolsPanel) {

        oldToolsPanel.classList.remove(
          "open"
        );

      }


      setPencilVisible(
        !pencilVisible
      );

    },
    true
  );


  /* =======================================================
     TOQUE NA PENCIL
     ======================================================= */

  pencilToggle.addEventListener(
    "click",
    event => {

      event.preventDefault();

      event.stopPropagation();


      togglePencilExpanded();

    }
  );


})();
